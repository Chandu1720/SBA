const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Kit = require('../models/Kit');
const ShopProfile = require('../models/ShopProfile');
const { generateNumber } = require('../utils/numberGenerator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// GET all bills
router.get('/', [auth, authorize(['bills:view'])], async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
  
    try {
      const query = search
        ? {
            $or: [
              { customerName: { $regex: search, $options: 'i' } },
              { customerPhone: { $regex: search, $options: 'i' } },
              { paymentStatus: { $regex: search, $options: 'i' } },
            ],
          }
        : {};
  
      const bills = await Bill.find(query)
        .populate('items.itemId')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
  
      const count = await Bill.countDocuments(query);
  
      res.json({
        bills,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          page: parseInt(page),
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// POST create a new bill with inventory reduction
router.post('/', [auth, authorize(['bills:create'])], async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, shop, ...restOfBody } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Bill must contain at least one item.' });
        }

        // Validate all items have required fields
        for (const item of items) {
            if (!item.name) {
                throw new Error('Each item must have a name.');
            }
            if (item.quantity === undefined || item.quantity <= 0) {
                throw new Error('Each item must have a valid quantity.');
            }
            if (item.rate === undefined || item.rate < 0) {
                throw new Error('Each item must have a valid rate.');
            }
            
            // For Product and Kit items, validate itemId is provided
            if (item.itemType === 'Product' || item.itemType === 'Kit') {
                if (!item.itemId) {
                    throw new Error(`Item "${item.name}" must have an itemId for type ${item.itemType}.`);
                }
                if (!item.itemModel) {
                    throw new Error(`Item "${item.name}" must have an itemModel (Product or Kit).`);
                }
            }
        }

        // Step 1: Process all items and prepare inventory updates
        for (const item of items) {
            if (item.itemType === 'Product') {
                const product = await Product.findById(item.itemId).session(session);
                if (!product) {
                    throw new Error(`Product with ID ${item.itemId} not found.`);
                }
                if (product.quantity < item.quantity) {
                    throw new Error(`Not enough stock for product "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}.`);
                }
                product.quantity -= item.quantity;
                await product.save({ session });
            } else if (item.itemType === 'Kit') {
                const kit = await Kit.findById(item.itemId).populate('products.product').session(session);
                if (!kit) {
                    throw new Error(`Kit with ID ${item.itemId} not found.`);
                }
                for (const kitProduct of kit.products) {
                    const product = await Product.findById(kitProduct.product._id).session(session);
                    if (!product) {
                        throw new Error(`Product "${kitProduct.product.name}" in kit "${kit.name}" not found.`);
                    }
                    const requiredQuantity = kitProduct.quantity * item.quantity;
                    if (product.quantity < requiredQuantity) {
                        throw new Error(`Not enough stock for product "${product.name}" in kit "${kit.name}". Available: ${product.quantity}, Required: ${requiredQuantity}.`);
                    }
                    product.quantity -= requiredQuantity;
                    await product.save({ session });
                }
            }
        }

        // Step 2: If all inventory updates are successful, create the bill
        const billNumber = await generateNumber('bill');
        const bill = new Bill({
            ...restOfBody,
            items,
            shop,
            billNumber,
            createdBy: req.user.id
        });

        const newBill = await bill.save({ session });
        
        await session.commitTransaction();
        res.status(201).json(newBill);

    } catch (err) {
        await session.abortTransaction();
        console.error('Error creating bill:', err);
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
    }
});
  
// GET bill by ID
router.get('/:id', [auth, authorize(['bills:view'])], async (req, res) => {
    try {
      const { id } = req.params;
      const bill = await Bill.findById(id).populate('items.itemId');
      if (!bill) {
        return res.status(404).json({ message: 'Bill not found' });
      }
      res.json(bill);
    } catch (err) {
      console.error(`Error fetching bill ${id}:`, err);
      res.status(500).json({ message: err.message });
    }
  });
  
// PUT update a bill
// 💡 IMPORTANT: Updating a bill now requires complex logic to handle inventory adjustments.
// For example, if a quantity changes, you must reverse the old stock deduction and apply the new one.
// This is a placeholder and needs to be fully implemented.
router.put('/:id', [auth, authorize(['bills:edit'])], async (req, res) => {
    try {
        const { id } = req.params;
        // This is a simplified update. A real implementation would require transaction support
        // to revert old inventory counts and apply new ones.
        const updatedBill = await Bill.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found.' });
        }
        res.json(updatedBill);
    } catch (err) {
      console.error(`Error updating bill ${id}:`, err);
      res.status(400).json({ message: err.message });
    }
});
  
// DELETE a bill
// 💡 IMPORTANT: Deleting a bill should ideally reverse the stock deduction.
// This is a placeholder and needs to be implemented.
router.delete('/:id', [auth, authorize(['bills:delete'])], async (req, res) => {
    try {
        const { id } = req.params;
        // A real implementation would use a transaction to find the bill,
        // revert stock quantities, and then delete the bill.
        const bill = await Bill.findByIdAndDelete(id);
        if (!bill) {
            return res.status(404).send('Bill not found.');
        }
        res.json({ message: 'Bill deleted (inventory not restocked).' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});
  
// GET download bill as PDF
router.get('/:id/download', [auth, authorize(['bills:view'])], async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findById(id).populate('items.itemId');
        const shopProfile = await ShopProfile.findOne(); // Fetch shop profile
    
        if (!bill) {
          return res.status(404).json({ message: "Bill not found" });
        }
        
        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bill-${id}.pdf`);

        doc.pipe(res);

        const startX = 40;
        const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const pageHeight = doc.page.height;

        let y = 50;

        /************************************
         * HEADER (SHOP INFO)
         ************************************/
        const shopBoxHeight = 80;
        const logoWidth = 50;
        const shopDetailsX = startX + logoWidth + 20;

        doc.fontSize(9)
          .text('ORIGINAL FOR RECIPIENT', startX, y - 12, { align: 'right', width: fullWidth });

        if (shopProfile?.logo_url) {
          const logoPath = path.join(__dirname,'..', '..', shopProfile.logo_url);
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, startX, y + 5, { width: logoWidth });
          }
        }

        doc.fontSize(18).font('Helvetica-Bold')
          .text(shopProfile?.shop_name || '', shopDetailsX, y + 15);

        doc.fontSize(10).font('Helvetica')
          .text(`GSTIN: ${shopProfile?.gstin || ''}`, shopDetailsX, y + 35)
          .text(shopProfile?.address || '', shopDetailsX, y + 48)
          .text(`Mobile: ${shopProfile?.phone_number || ''}`, shopDetailsX, y + 61);

        y += shopBoxHeight + 10;


        /************************************
         * CUSTOMER + BILL INFO BOX
         ************************************/
        const infoBoxHeight = 100;
        doc.rect(startX, y, fullWidth, infoBoxHeight).stroke();

        const halfWidth = fullWidth / 2;
        doc.moveTo(startX + halfWidth, y).lineTo(startX + halfWidth, y + infoBoxHeight).stroke();

        doc.font('Helvetica-Bold').fontSize(10).text('Customer Details:', startX + 10, y + 5);
        doc.font('Helvetica').fontSize(9)
          .text(`Name: ${bill.customerName || ''}`, startX + 10, y + 18)
          .text(`Phone: ${bill.customerPhone || ''}`, startX + 10, y + 30);

        const rightX = startX + halfWidth + 10;
        const rightValueX = rightX + 75;

        doc.font('Helvetica-Bold').fontSize(10)
          .text('Invoice #:', rightX, y + 5)
          .text('Invoice Date:', rightX, y + 18);

        doc.font('Helvetica').fontSize(9)
          .text(bill.billNumber, rightValueX, y + 5)
          .text(bill.billDate ? new Date(bill.billDate).toLocaleDateString() : '', rightValueX, y + 18);

        y += infoBoxHeight + 10;


        /************************************
         * COLUMN SETUP HELPERS
         ************************************/
        const amountColWidth = 65;
        const amountColX = startX + fullWidth - amountColWidth;

        const rateColWidth = 55;
        const rateColX = amountColX - rateColWidth;

        const qtyColWidth = 40;
        const qtyColX = rateColX - qtyColWidth;

        const taxColWidth = 45;
        const taxColX = qtyColX - taxColWidth;

        const hsnColWidth = 60;
        const hsnColX = taxColX - hsnColWidth;

        const itemColX = startX + 30;
        const itemColWidth = hsnColX - itemColX - 5;


        /************************************
         * DRAW TABLE HEADER
         ************************************/
        function drawHeader() {
          doc.rect(startX, y, fullWidth, 20).stroke();
          y += 5;
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('#', startX + 10, y);
          doc.text('Item', itemColX, y);
          doc.text('HSN/SAC', hsnColX, y, { width: hsnColWidth, align: 'center' });
          doc.text('Tax', taxColX, y, { width: taxColWidth, align: 'center' });
          doc.text('Qty', qtyColX, y, { width: qtyColWidth, align: 'center' });
          doc.text('Rate / Item', rateColX, y, { width: rateColWidth, align: 'center' });
          doc.text('Amount', amountColX, y, { width: amountColWidth, align: 'right' });
          y += 15;
        }

        /************************************
         * GRID: VERTICAL DOTTED LINES
         ************************************/
        function drawVerticalGrid() {
          const vStart = y;
          const vEnd = pageHeight - 160; 

          function dottedLine(x) {
            doc.moveTo(x, vStart).lineTo(x, vEnd).dash(1, { space: 2 }).stroke().undash();
          }
          dottedLine(itemColX - 5);
          dottedLine(hsnColX - 5);
          dottedLine(qtyColX - 5);
          dottedLine(rateColX - 5);
          dottedLine(amountColX - 5);
        }


        /************************************
         * ITEMS LOOP WITH PAGINATION
         ************************************/
        const items = bill.items || [];
        let itemCounter = 1;
        
        drawHeader();
        drawVerticalGrid();
        
      for (let item of items) {
    if (y > pageHeight - 200) {
        doc.addPage();
        y = 50;
        drawHeader();
        drawVerticalGrid();
    }

    // 1. Resolve Name based on itemType
    let itemName = 'N/A';
    if (item.itemType === 'Simple') {
        itemName = item.name;
    } else if (item.itemId) {
        itemName = item.itemId.name;
    }

    // 2. Resolve HSN
    const itemHSN = (item.itemId && item.itemId.hsn_sac) ? item.itemId.hsn_sac : 'N/A';
    
    // 3. Resolve Tax (Note: If tax isn't in your schema, you need to add it or pull it from the product)
    // For now, checking if it exists on the populated product or the item itself
    const taxRate = item.taxRate || (item.itemId && item.itemId.taxRate) || 0;

    doc.font('Helvetica').fontSize(9);
    doc.text(`${itemCounter++}`, startX + 10, y);
    doc.text(itemName, itemColX, y, { width: itemColWidth });
    doc.text(itemHSN, hsnColX, y, { width: hsnColWidth, align: 'center' });
    doc.text(`${taxRate}%`, taxColX, y, { width: taxColWidth, align: 'center' });
    doc.text(`${item.quantity}`, qtyColX, y, { width: qtyColWidth, align: 'center' });
    doc.text(`${item.rate.toFixed(2)}`, rateColX, y, { width: rateColWidth, align: 'center' });
    doc.text(`${item.total.toFixed(2)}`, amountColX, y, { width: amountColWidth, align: 'right' });
    
    y += 15;
}


        /************************************
         * ONLY ON LAST PAGE: TOTAL + QR + BANK + SIGN
         ************************************/
        y = pageHeight - 150; // Position near the bottom
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Total: ₹${bill.grandTotal.toFixed(2)}`, amountColX - 60, y, { width: amountColWidth + 60, align: 'right' });

        const footerY = pageHeight - 140;
        const footerHeight = 80;

        doc.rect(startX, footerY, fullWidth, footerHeight).stroke();

        const colWidth = fullWidth / 3;
        const col2X = startX + colWidth;
        const col3X = startX + colWidth * 2;

        doc.moveTo(col2X, footerY).lineTo(col2X, footerY + footerHeight).stroke();
        doc.moveTo(col3X, footerY).lineTo(col3X, footerY + footerHeight).stroke();


        /***** BANK DETAILS *****/
        doc.font('Helvetica-Bold').fontSize(9)
          .text('Bank Details', startX + 10, footerY + 8);
        doc.font('Helvetica').fontSize(8)
          .text(`Bank: ${shopProfile?.bank_name || 'YES BANK'}`, startX + 10, footerY + 22)
          .text(`A/C: ${shopProfile?.account_no || ''}`, startX + 10, footerY + 34)
          .text(`IFSC: ${shopProfile?.ifsc || ''}`, startX + 10, footerY + 46);


        /***** QR *****/
        doc.font('Helvetica-Bold').fontSize(9)
          .text('Pay using UPI', col2X + 10, footerY + 5);

        if (shopProfile?.qr_url) {
          const qrPath = path.join(__dirname, '..', '..', shopProfile.qr_url);
          if (fs.existsSync(qrPath)) {
            doc.image(qrPath, col2X + 20, footerY + 20, {
              width: colWidth - 40,
              height: footerHeight - 40,
              fit: [colWidth - 40, footerHeight - 40]
            });
          }
        }


        /***** SIGNATURE *****/
        const sigX = col3X + 10;
        doc.font('Helvetica-Bold').fontSize(9)
          .text(`For ${shopProfile?.shop_name || ''}`, sigX, footerY + 5);

        if (shopProfile?.sign_url) {
          const signPath = path.join(__dirname, '..', '..', shopProfile.sign_url);
          if (fs.existsSync(signPath)) {
            doc.image(signPath, sigX + 20, footerY + 20, { width: colWidth - 60 });
          }
        }

        doc.font('Helvetica').fontSize(8)
          .text('Authorized Signatory', sigX + 20, footerY + footerHeight - 18);


        /***** FOOT NOTE *****/
        doc.fontSize(7).text(
          'This is a computer-generated invoice',
          startX,
          footerY + footerHeight + 5,
          { width: fullWidth, align: 'center' }
        );


        doc.end();
    
      } catch (err) {
        console.error(`Error generating bill PDF:`, err);
        res.status(500).json({ message: err.message });
      }
  });

  // GET export bills
router.get('/export', [auth, authorize(['bills:export'])], async (req, res) => {
    const { type = 'excel', search = '' } = req.query;
  
    try {
      const query = search
        ? {
            $or: [
              { customerName: { $regex: search, $options: 'i' } },
              { customerPhone: { $regex: search, $options: 'i' } },
              { paymentStatus: { $regex: search, $options: 'i' } },
            ],
          }
        : {};
  
      const bills = await Bill.find(query).sort({ billDate: -1 }).exec();
  
      if (type === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bills.pdf`);
  
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.pipe(res);
  
        doc.fontSize(16).text('Bills Report', { align: 'center' });
        doc.moveDown();
  
        bills.forEach(bill => {
          doc.fontSize(12).text(`Bill Number: ${bill.billNumber}`);
          doc.fontSize(10).text(`Customer: ${bill.customerName}`);
          doc.text(`Total: ${bill.grandTotal}`);
          doc.moveDown();
        });
  
        doc.end();
      } else {
        res.json(bills);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


module.exports = router;