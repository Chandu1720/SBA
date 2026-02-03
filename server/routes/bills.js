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
// GET download bill as PDF (A4 + HALF, CGST/SGST vs IGST)
router.get('/:id/download', [auth, authorize(['bills:view'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { size = 'A4' } = req.query; // A4 | HALF

    const bill = await Bill.findById(id);
    const shopProfile = await ShopProfile.findOne();

    if (!bill || !shopProfile) {
      return res.status(404).json({ message: 'Bill or Shop profile not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=INV-${bill.billNumber}.pdf`
    );
    doc.pipe(res);

    const isHalf = size === 'HALF';
    const PAGE_HEIGHT = doc.page.height;
    const INVOICE_HEIGHT = isHalf ? PAGE_HEIGHT / 2 : PAGE_HEIGHT;

    const margin = 40;
    const pageWidth = doc.page.width;

    // ================= TAX LOGIC =================
    const taxableAmount = bill.items.reduce(
      (sum, i) => sum + i.quantity * i.rate,
      0
    );

    const GST_RATE = bill.gstRate || 5; // configurable
    const isIGST = shopProfile.state !== bill.placeOfSupply;

    let cgst = 0,
      sgst = 0,
      igst = 0;

    if (isIGST) {
      igst = taxableAmount * (GST_RATE / 100);
    } else {
      cgst = taxableAmount * (GST_RATE / 2 / 100);
      sgst = taxableAmount * (GST_RATE / 2 / 100);
    }

    const grandTotal = taxableAmount + cgst + sgst + igst;

    // ================= RENDER FUNCTION =================
    function renderInvoice(startY, copyLabel) {
      let y = startY;

      // Copy label
      doc.fontSize(8).text(copyLabel, pageWidth - 200, y - 20, { align: 'right' });

      // Header
      doc.font('Helvetica-Bold').fontSize(14).text(shopProfile.shop_name, margin, y);
      y += 15;

      doc.fontSize(9).font('Helvetica');
      doc.text(shopProfile.address);
      doc.text(`GSTIN: ${shopProfile.gstin}`);
      doc.text(`Phone: ${shopProfile.phone_number}`);

      // Invoice meta
      doc.text(`Invoice No: ${bill.billNumber}`, pageWidth - 200, startY);
      doc.text(
        `Date: ${new Date(bill.billDate).toLocaleDateString('en-IN')}`,
        pageWidth - 200,
        startY + 12
      );

      y += 40;

      // Customer
      doc.font('Helvetica-Bold').text('Customer Details');
      doc.font('Helvetica');
      doc.text(bill.customerName || 'Walk-in Customer');
      doc.text(bill.customerPhone || '');

      y += 20;

      // ================= ITEMS TABLE =================
      const colSno = margin;
      const colItem = colSno + 30;
      const colQty = colItem + 250;
      const colRate = colQty + 60;
      const colAmt = colRate + 90;

      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('#', colSno, y);
      doc.text('Item', colItem, y);
      doc.text('Qty', colQty, y, { align: 'center', width: 50 });
      doc.text('Rate', colRate, y, { align: 'right', width: 80 });
      doc.text('Amount', colAmt, y, { align: 'right', width: 80 });

      y += 12;
      doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
      y += 6;

      doc.font('Helvetica').fontSize(9);
      let i = 1;

      bill.items.forEach(item => {
        const amt = item.quantity * item.rate;

        doc.text(i++, colSno, y);
        doc.text(item.name, colItem, y, { width: 240 });
        doc.text(item.quantity, colQty, y, { align: 'center', width: 50 });
        doc.text(item.rate.toFixed(2), colRate, y, { align: 'right', width: 80 });
        doc.text(amt.toFixed(2), colAmt, y, { align: 'right', width: 80 });

        y += 16;
      });

      y += 10;

      // ================= TOTALS =================
      doc.font('Helvetica').fontSize(9);
      doc.text('Taxable Amount', colRate, y);
      doc.text(taxableAmount.toFixed(2), colAmt, y, { align: 'right' });

      y += 14;

      if (isIGST) {
        doc.text(`IGST ${GST_RATE}%`, colRate, y);
        doc.text(igst.toFixed(2), colAmt, y, { align: 'right' });
      } else {
        doc.text(`CGST ${GST_RATE / 2}%`, colRate, y);
        doc.text(cgst.toFixed(2), colAmt, y, { align: 'right' });

        y += 14;
        doc.text(`SGST ${GST_RATE / 2}%`, colRate, y);
        doc.text(sgst.toFixed(2), colAmt, y, { align: 'right' });
      }

      y += 16;
      doc.font('Helvetica-Bold');
      doc.text('Grand Total', colRate, y);
      doc.text(grandTotal.toFixed(2), colAmt, y, { align: 'right' });

      y += 20;

      // Amount in words
      doc.font('Helvetica').fontSize(9);
      doc.text(
        `Amount Chargeable (in words): INR ${numberToWords(grandTotal)} Only`,
        margin,
        y
      );

      return startY + INVOICE_HEIGHT;
    }

    // ================= RENDER BASED ON SIZE =================
    if (isHalf) {
      renderInvoice(40, 'ORIGINAL FOR RECIPIENT');
      renderInvoice(PAGE_HEIGHT / 2 + 20, 'DUPLICATE FOR SUPPLIER');
    } else {
      renderInvoice(40, 'ORIGINAL FOR RECIPIENT');
    }

    doc.end();
  } catch (err) {
    console.error('PDF Error:', err);
    res.status(500).json({ message: err.message });
  }
});
function numberToWords(amount) {
  if (amount === 0) return 'Zero Rupees';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five',
    'Six', 'Seven', 'Eight', 'Nine'
  ];

  const teens = [
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty',
    'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertBelowThousand = num => {
    let str = '';

    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      str += teens[num - 10] + ' ';
      return str;
    }

    if (num > 0) {
      str += ones[num] + ' ';
    }

    return str;
  };

  let [rupees, paise] = amount.toFixed(2).split('.').map(Number);

  let words = '';

  if (rupees >= 10000000) {
    words += convertBelowThousand(Math.floor(rupees / 10000000)) + 'Crore ';
    rupees %= 10000000;
  }

  if (rupees >= 100000) {
    words += convertBelowThousand(Math.floor(rupees / 100000)) + 'Lakh ';
    rupees %= 100000;
  }

  if (rupees >= 1000) {
    words += convertBelowThousand(Math.floor(rupees / 1000)) + 'Thousand ';
    rupees %= 1000;
  }

  if (rupees > 0) {
    words += convertBelowThousand(rupees);
  }

  words = words.trim() + ' Rupees';

  if (paise > 0) {
    words += ' and ' + convertBelowThousand(paise).trim() + ' Paise';
  }

  return words;
}





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
