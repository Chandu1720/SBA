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
  

// PUT clear a bill due
router.put('/:id/clear-due', [auth, authorize(['bills:edit'])], async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found.' });
        }
        bill.paidAmount = bill.grandTotal;
        bill.paymentStatus = 'Paid';
        const updatedBill = await bill.save();
        res.json(updatedBill);
    } catch (err) {
      console.error(`Error clearing bill due ${id}:`, err);
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
    const shopProfile = await ShopProfile.findOne();

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.billNumber}.pdf`);
    doc.pipe(res);

    const startX = 40;
    const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight = doc.page.height;
    let y = 50;

    /***********************
     * HEADER (SHOP INFO)
     ***********************/
    const logoWidth = 55;
    const shopDetailsX = startX + logoWidth + 15;

    doc.fontSize(9)
      .text('TAX INVOICE', startX, y - 15, { align: 'right', width: fullWidth });

    if (shopProfile?.logo_url) {
      const logoPath = path.resolve(process.cwd(), shopProfile.logo_url);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, startX, y, { width: logoWidth });
      }
    }

    doc.font('Helvetica-Bold').fontSize(18)
      .text(shopProfile?.shop_name || '', shopDetailsX, y + 5);

    doc.font('Helvetica').fontSize(9)
      .text(`GSTIN: ${shopProfile?.gstin || ''}`, shopDetailsX, y + 28)
      .text(shopProfile?.address || '', shopDetailsX, y + 40)
      .text(`Mobile: ${shopProfile?.phone_number || ''}`, shopDetailsX, y + 54);

    y += 90;

    /***********************
     * CUSTOMER + BILL INFO
     ***********************/
    doc.rect(startX, y, fullWidth, 90).stroke();
    doc.moveTo(startX + fullWidth / 2, y)
       .lineTo(startX + fullWidth / 2, y + 90)
       .stroke();

    doc.font('Helvetica-Bold').fontSize(10)
      .text('Customer Details', startX + 10, y + 8);

    doc.font('Helvetica').fontSize(9)
      .text(`Name: ${bill.customerName || ''}`, startX + 10, y + 26)
      .text(`Phone: ${bill.customerPhone || ''}`, startX + 10, y + 40);

    const rx = startX + fullWidth / 2 + 10;

    doc.font('Helvetica-Bold').fontSize(10)
      .text('Invoice No:', rx, y + 8)
      .text('Invoice Date:', rx, y + 26);

    doc.font('Helvetica').fontSize(9)
      .text(bill.billNumber, rx + 80, y + 8)
      .text(new Date(bill.billDate).toLocaleDateString(), rx + 80, y + 26);

    y += 110;

    /***********************
     * TABLE COLUMNS
     ***********************/
    const amountColWidth = 70;
    const amountColX = startX + fullWidth - amountColWidth;

    const gstColWidth = 55;
    const gstColX = amountColX - gstColWidth;

    const rateColWidth = 55;
    const rateColX = gstColX - rateColWidth;

    const qtyColWidth = 40;
    const qtyColX = rateColX - qtyColWidth;

    const itemColX = startX + 30;
    const itemColWidth = qtyColX - itemColX - 5;

    function drawHeader() {
      doc.rect(startX, y, fullWidth, 20).stroke();
      y += 5;

      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('#', startX + 10, y);
      doc.text('Item', itemColX, y);
      doc.text('Qty', qtyColX, y, { width: qtyColWidth, align: 'center' });
      doc.text('Rate', rateColX, y, { width: rateColWidth, align: 'center' });
      doc.text('GST', gstColX, y, { width: gstColWidth, align: 'center' });
      doc.text('Amount', amountColX, y, { width: amountColWidth, align: 'right' });

      y += 15;
    }

    function drawGrid() {
      const bottom = pageHeight - 170;
      [itemColX - 5, qtyColX - 5, rateColX - 5, gstColX - 5, amountColX - 5]
        .forEach(x => {
          doc.moveTo(x, y)
             .lineTo(x, bottom)
             .dash(1, { space: 2 })
             .stroke()
             .undash();
        });
    }

    drawHeader();
    drawGrid();

    /***********************
     * ITEMS
     ***********************/
    let i = 1;
    let totalGST = 0;

    for (const item of bill.items) {
      if (y > pageHeight - 200) {
        doc.addPage();
        y = 50;
        drawHeader();
        drawGrid();
      }

      const name =
        item.itemType === 'Simple'
          ? item.name
          : item.itemId?.name || 'N/A';

      const gstRate = item.taxRate || 18;
      const base = item.quantity * item.rate;
      const gstAmt = (base * gstRate) / 100;
      const total = base + gstAmt;

      totalGST += gstAmt;

      doc.font('Helvetica').fontSize(9);
      doc.text(i++, startX + 10, y);
      doc.text(name, itemColX, y, { width: itemColWidth });
      doc.text(item.quantity.toString(), qtyColX, y, { width: qtyColWidth, align: 'center' });
      doc.text(item.rate.toFixed(2), rateColX, y, { width: rateColWidth, align: 'center' });
      doc.text(`₹${gstAmt.toFixed(2)}`, gstColX, y, { width: gstColWidth, align: 'center' });
      doc.text(`₹${total.toFixed(2)}`, amountColX, y, { width: amountColWidth, align: 'right' });

      y += 15;
    }

    /***********************
     * TOTALS
     ***********************/
    y = pageHeight - 160;

    doc.font('Helvetica').fontSize(9)
      .text(`GST Total: ₹${totalGST.toFixed(2)}`, amountColX - 80, y, {
        width: amountColWidth + 80,
        align: 'right'
      });

    doc.font('Helvetica-Bold').fontSize(11)
      .text(`Grand Total: ₹${bill.grandTotal.toFixed(2)}`, amountColX - 80, y + 15, {
        width: amountColWidth + 80,
        align: 'right'
      });

    /***********************
     * FOOTER (BANK + QR + SIGN)
     ***********************/
    const footerY = pageHeight - 120;
    const colWidth = fullWidth / 3;

    doc.rect(startX, footerY, fullWidth, 80).stroke();
    doc.moveTo(startX + colWidth, footerY).lineTo(startX + colWidth, footerY + 80).stroke();
    doc.moveTo(startX + colWidth * 2, footerY).lineTo(startX + colWidth * 2, footerY + 80).stroke();

    doc.font('Helvetica-Bold').fontSize(9)
      .text('Bank Details', startX + 10, footerY + 8);

    doc.font('Helvetica').fontSize(8)
      .text(`Bank: ${shopProfile?.bank_name || ''}`, startX + 10, footerY + 24)
      .text(`A/C: ${shopProfile?.account_no || ''}`, startX + 10, footerY + 36)
      .text(`IFSC: ${shopProfile?.ifsc || ''}`, startX + 10, footerY + 48);

    if (shopProfile?.qr_url) {
      const qrPath = path.resolve(process.cwd(), shopProfile.qr_url);
      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, startX + colWidth + 20, footerY + 20, { width: colWidth - 40 });
      }
    }

    if (shopProfile?.sign_url) {
      const signPath = path.resolve(process.cwd(), shopProfile.sign_url);
      if (fs.existsSync(signPath)) {
        doc.image(signPath, startX + colWidth * 2 + 20, footerY + 20, { width: colWidth - 40 });
      }
    }

    doc.fontSize(7)
      .text('This is a computer generated invoice', startX, pageHeight - 30, {
        width: fullWidth,
        align: 'center'
      });

    doc.end();

  } catch (err) {
    console.error('PDF Error:', err);
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
