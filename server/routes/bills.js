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
const axios = require('axios')

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
async function fetchImageBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

// ================= PDF DOWNLOAD =================
router.get('/:id/download', [auth, authorize(['bills:view'])], async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    const shop = await ShopProfile.findOne();

    if (!bill || !shop) {
      return res.status(404).json({ message: 'Bill or shop profile not found' });
    }

    // Fetch Cloudinary images
    const logoBuffer = shop.logo_url ? await fetchImageBuffer(shop.logo_url) : null;
    const qrBuffer   = shop.qrCodePath ? await fetchImageBuffer(shop.qrCodePath) : null;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=INV-${bill.billNumber}.pdf`);
    doc.pipe(res);

    const left = 40;
    const pageWidth = doc.page.width - 80;
    let y = 40;

    // ================= HEADER =================
    if (logoBuffer) doc.image(logoBuffer, left, y, { width: 60 });

    doc.font('Helvetica-Bold').fontSize(14)
      .text(shop.shop_name, left + 70, y);

    doc.fontSize(9).font('Helvetica')
      .text(`GSTIN: ${shop.gstin}`, left + 70, y + 18)
      .text(shop.address, left + 70, y + 32)
      .text(`Mobile: ${shop.phone_number}`, left + 70, y + 46);

    y += 80;

    // ================= CUSTOMER BOX =================
    doc.rect(left, y, pageWidth, 80).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text('Customer Details', left + 5, y + 5);

    doc.font('Helvetica').fontSize(9)
      .text(`Name: ${bill.customerName}`, left + 5, y + 22)
      .text(`Phone: ${bill.customerPhone}`, left + 5, y + 38)
      .text(`Invoice No: ${bill.billNumber}`, left + pageWidth / 2, y + 22)
      .text(`Date: ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, left + pageWidth / 2, y + 38);

    y += 100;

    // ================= ITEMS TABLE =================
    const cols = { sno: 30, name: 260, qty: 60, rate: 80, amt: 80 };
    const rowH = 20;

    doc.font('Helvetica-Bold').fontSize(9);
    let x = left;
    ['#', 'Item', 'Qty', 'Rate', 'Amount'].forEach((t, i) => {
      doc.text(t, x + 5, y + 5);
      x += Object.values(cols)[i];
    });

    y += rowH;
    doc.font('Helvetica').fontSize(9);

    let taxable = 0;
    bill.items.forEach((it, i) => {
      const amt = it.quantity * it.rate;
      taxable += amt;

      let cx = left;
      doc.text(i + 1, cx + 5, y + 5); cx += cols.sno;
      doc.text(it.name, cx + 5, y + 5, { width: cols.name - 10 }); cx += cols.name;
      doc.text(it.quantity, cx + 5, y + 5); cx += cols.qty;
      doc.text(it.rate.toFixed(2), cx + 5, y + 5, { align: 'right', width: cols.rate - 10 }); cx += cols.rate;
      doc.text(amt.toFixed(2), cx + 5, y + 5, { align: 'right', width: cols.amt - 10 });

      y += rowH;
    });

    // ================= TAX =================
    const GST_RATE = 18;
    const gst = taxable * GST_RATE / 100;
    const grandTotal = taxable + gst;

    y += 20;
    doc.font('Helvetica-Bold').text('Taxable Amount', left + 300, y)
      .text(taxable.toFixed(2), left + 430, y, { align: 'right' });

    y += 15;
    doc.text(`GST @ ${GST_RATE}%`, left + 300, y)
      .text(gst.toFixed(2), left + 430, y, { align: 'right' });

    y += 18;
    doc.text('Grand Total', left + 300, y)
      .text(grandTotal.toFixed(2), left + 430, y, { align: 'right' });

    y += 25;
    doc.font('Helvetica').fontSize(9)
      .text(`Amount in Words: INR ${numberToWords(grandTotal)} Only`, left, y);

    // ================= FOOTER =================
    y += 40;
    doc.rect(left, y, pageWidth, 80).stroke();

    doc.font('Helvetica-Bold').fontSize(9)
      .text('Bank Details', left + 5, y + 5);

    doc.font('Helvetica').fontSize(8)
      .text(`Bank: ${shop.bankDetails?.bankName}`, left + 5, y + 22)
      .text(`A/C: ${shop.bankDetails?.accountNumber}`, left + 5, y + 36)
      .text(`IFSC: ${shop.bankDetails?.ifsc}`, left + 5, y + 50);

    doc.font('Helvetica-Bold').text('Pay via UPI', left + pageWidth / 2, y + 5);
    if (qrBuffer) doc.image(qrBuffer, left + pageWidth / 2 + 40, y + 22, { width: 60 });

    doc.end();
  } catch (err) {
    console.error('PDF ERROR:', err);
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
