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

    // Professional PDF settings
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=INV-${bill.billNumber}.pdf`);
    doc.pipe(res);

    // Define color scheme (professional blue and gray)
    const colors = {
      primary: '#2563eb',      // Modern blue
      secondary: '#475569',    // Slate gray
      text: '#1e293b',         // Dark slate
      lightGray: '#f1f5f9',    // Very light gray
      border: '#cbd5e1',       // Light border
      success: '#059669',      // Green for paid
      warning: '#dc2626'       // Red for unpaid
    };

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const usableWidth = pageWidth - (margin * 2);

    let yPosition = margin;

    // ═══════════════════════════════════════════════════════
    // HEADER SECTION - Company Branding
    // ═══════════════════════════════════════════════════════
    
    // Add colored header bar
    doc.rect(0, 0, pageWidth, 120)
       .fill(colors.lightGray);

    yPosition = margin;

    // Company Logo (if available)
    const logoSize = 70;
    let logoX = margin;
    
    if (shopProfile?.logo_url) {
      const logoPath = path.resolve(process.cwd(), shopProfile.logo_url);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, logoX, yPosition, { 
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize]
        });
      }
    }

    // Company Details (right of logo)
    const companyDetailsX = logoX + logoSize + 20;
    
    doc.fillColor(colors.primary)
       .fontSize(22)
       .font('Helvetica-Bold')
       .text(shopProfile?.shop_name || 'Company Name', companyDetailsX, yPosition);

    doc.fillColor(colors.text)
       .fontSize(9)
       .font('Helvetica')
       .text(shopProfile?.address || '', companyDetailsX, yPosition + 28, {
         width: 250,
         lineGap: 2
       });

    doc.fontSize(9)
       .text(`Phone: ${shopProfile?.phone_number || 'N/A'}`, companyDetailsX, yPosition + 52)
       .text(`GSTIN: ${shopProfile?.gstin || 'N/A'}`, companyDetailsX, yPosition + 65);

    // Invoice Label (top right)
    doc.fillColor(colors.primary)
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('INVOICE', pageWidth - 200, yPosition, {
         width: 150,
         align: 'right'
       });

    yPosition = 140;

    // ═══════════════════════════════════════════════════════
    // INVOICE INFO & CUSTOMER SECTION
    // ═══════════════════════════════════════════════════════

    // Two-column layout
    const col1X = margin;
    const col1Width = usableWidth * 0.55;
    const col2X = margin + col1Width + 20;
    const col2Width = usableWidth * 0.45 - 20;

    // Bill To Section (Left Column)
    doc.fillColor(colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('BILL TO', col1X, yPosition);

    yPosition += 18;

    doc.fillColor(colors.text)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(bill.customerName || 'Walk-in Customer', col1X, yPosition);

    doc.fontSize(9)
       .font('Helvetica')
       .text(bill.customerPhone || 'N/A', col1X, yPosition + 16);

    if (bill.customerEmail) {
      doc.text(bill.customerEmail, col1X, yPosition + 30);
    }

    // Invoice Details (Right Column)
    const invoiceDetailsY = yPosition - 18;
    
    doc.fillColor(colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('INVOICE DETAILS', col2X, invoiceDetailsY);

    const detailsStartY = invoiceDetailsY + 18;
    const labelWidth = 100;

    // Helper function for detail rows
    const addDetailRow = (label, value, y) => {
      doc.fillColor(colors.secondary)
         .fontSize(9)
         .font('Helvetica')
         .text(label, col2X, y);
      
      doc.fillColor(colors.text)
         .font('Helvetica-Bold')
         .text(value, col2X + labelWidth, y, {
           width: col2Width - labelWidth,
           align: 'left'
         });
    };

    addDetailRow('Invoice No:', bill.billNumber, detailsStartY);
    addDetailRow('Invoice Date:', new Date(bill.billDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }), detailsStartY + 16);
    
    // Payment status with color coding
    doc.fillColor(colors.secondary)
       .fontSize(9)
       .font('Helvetica')
       .text('Status:', col2X, detailsStartY + 32);
    
    const statusColor = bill.paymentStatus === 'Paid' ? colors.success : colors.warning;
    doc.fillColor(statusColor)
       .font('Helvetica-Bold')
       .text(bill.paymentStatus || 'Pending', col2X + labelWidth, detailsStartY + 32);

    yPosition = Math.max(yPosition + 70, detailsStartY + 60);

    // Divider line
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(margin, yPosition)
       .lineTo(pageWidth - margin, yPosition)
       .stroke();

    yPosition += 25;

    // ═══════════════════════════════════════════════════════
    // ITEMS TABLE
    // ═══════════════════════════════════════════════════════

    // Table column definitions
    const tableTop = yPosition;
    const itemColX = margin;
    const itemColWidth = usableWidth * 0.40;
    const qtyColX = itemColX + itemColWidth;
    const qtyColWidth = 60;
    const rateColX = qtyColX + qtyColWidth;
    const rateColWidth = 80;
    const gstColX = rateColX + rateColWidth;
    const gstColWidth = 70;
    const amountColX = gstColX + gstColWidth;
    const amountColWidth = usableWidth - (amountColX - margin);

    // Table Header
    doc.rect(margin, tableTop, usableWidth, 30)
       .fill(colors.primary);

    doc.fillColor('#ffffff')
       .fontSize(9)
       .font('Helvetica-Bold');

    const headerY = tableTop + 10;
    doc.text('ITEM DESCRIPTION', itemColX + 5, headerY, { width: itemColWidth - 10 });
    doc.text('QTY', qtyColX + 5, headerY, { width: qtyColWidth - 10, align: 'center' });
    doc.text('RATE', rateColX + 5, headerY, { width: rateColWidth - 10, align: 'right' });
    doc.text('GST', gstColX + 5, headerY, { width: gstColWidth - 10, align: 'right' });
    doc.text('AMOUNT', amountColX + 5, headerY, { width: amountColWidth - 10, align: 'right' });

    yPosition = tableTop + 35;

    // Table Rows
    let rowIndex = 0;
    let totalGST = 0;
    let subtotal = 0;

    for (const item of bill.items) {
      // Check if we need a new page
      if (yPosition > pageHeight - 200) {
        doc.addPage();
        yPosition = margin;
      }

      const itemName = item.itemType === 'Simple' 
        ? item.name 
        : item.itemId?.name || 'N/A';

      const gstRate = item.taxRate || 18;
      const baseAmount = item.quantity * item.rate;
      const gstAmount = (baseAmount * gstRate) / 100;
      const itemTotal = baseAmount + gstAmount;

      totalGST += gstAmount;
      subtotal += baseAmount;

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.rect(margin, yPosition - 5, usableWidth, 25)
           .fill('#fafafa');
      }

      doc.fillColor(colors.text)
         .fontSize(9)
         .font('Helvetica');

      // Item name
      doc.text(itemName, itemColX + 5, yPosition, { 
        width: itemColWidth - 10,
        ellipsis: true
      });

      // Quantity
      doc.text(item.quantity.toString(), qtyColX + 5, yPosition, { 
        width: qtyColWidth - 10,
        align: 'center'
      });

      // Rate
      doc.text(`₹${item.rate.toFixed(2)}`, rateColX + 5, yPosition, { 
        width: rateColWidth - 10,
        align: 'right'
      });

      // GST
      doc.text(`₹${gstAmount.toFixed(2)}`, gstColX + 5, yPosition, { 
        width: gstColWidth - 10,
        align: 'right'
      });

      // Amount
      doc.font('Helvetica-Bold')
         .text(`₹${itemTotal.toFixed(2)}`, amountColX + 5, yPosition, { 
           width: amountColWidth - 10,
           align: 'right'
         });

      yPosition += 25;
      rowIndex++;
    }

    // Bottom border of table
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(margin, yPosition)
       .lineTo(pageWidth - margin, yPosition)
       .stroke();

    yPosition += 20;

    // ═══════════════════════════════════════════════════════
    // TOTALS SECTION
    // ═══════════════════════════════════════════════════════

    const totalsX = pageWidth - margin - 200;
    const totalsLabelX = totalsX;
    const totalsValueX = totalsX + 100;

    // Helper function for total rows
    const addTotalRow = (label, value, y, isBold = false) => {
      const font = isBold ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = isBold ? 11 : 9;

      doc.fillColor(colors.text)
         .fontSize(fontSize)
         .font(font)
         .text(label, totalsLabelX, y, { width: 100, align: 'left' });

      doc.text(value, totalsValueX, y, { width: 100, align: 'right' });
    };

    addTotalRow('Subtotal:', `₹${subtotal.toFixed(2)}`, yPosition);
    addTotalRow('GST Total:', `₹${totalGST.toFixed(2)}`, yPosition + 18);
    
    // Grand Total with background
    const grandTotalY = yPosition + 40;
    doc.rect(totalsX - 10, grandTotalY - 5, 210, 28)
       .fill(colors.primary);

    doc.fillColor('#ffffff')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Grand Total:', totalsLabelX, grandTotalY, { width: 100, align: 'left' })
       .text(`₹${bill.grandTotal.toFixed(2)}`, totalsValueX, grandTotalY, { width: 100, align: 'right' });

    yPosition = grandTotalY + 50;

    // Amount in words
    if (yPosition > pageHeight - 180) {
      doc.addPage();
      yPosition = margin;
    }

    doc.fillColor(colors.secondary)
       .fontSize(9)
       .font('Helvetica-Oblique')
       .text('Amount in Words: ', margin, yPosition);
    
    doc.fillColor(colors.text)
       .font('Helvetica-Bold')
       .text(numberToWords(bill.grandTotal) + ' Only', margin + 110, yPosition, {
         width: usableWidth - 110
       });

    // ═══════════════════════════════════════════════════════
    // FOOTER SECTION
    // ═══════════════════════════════════════════════════════

    const footerY = pageHeight - 140;

    // Footer background
    doc.rect(0, footerY - 10, pageWidth, 150)
       .fill(colors.lightGray);

    // Three columns: Bank Details, QR Code, Signature
    const footerColWidth = usableWidth / 3;
    const bankX = margin;
    const qrX = margin + footerColWidth;
    const signX = margin + footerColWidth * 2;

    // Bank Details
    doc.fillColor(colors.primary)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('BANK DETAILS', bankX, footerY);

    doc.fillColor(colors.text)
       .fontSize(8)
       .font('Helvetica')
       .text(`Bank: ${shopProfile?.bankDetails?.bankName || 'N/A'}`, bankX, footerY + 16)
       .text(`Account: ${shopProfile.bankDetails?.accountNumber || 'N/A'}`, bankX, footerY + 28)
       .text(`IFSC: ${shopProfile?.bankDetails?.ifsc || 'N/A'}`, bankX, footerY + 40);

    // QR Code for Payment
    if (shopProfile?.qr_url) {
      const qrPath = path.resolve(process.cwd(), shopProfile.qrCodePath);
      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, qrX + 30, footerY + 10, { 
          width: 70,
          height: 70,
          fit: [70, 70]
        });
        doc.fillColor(colors.secondary)
           .fontSize(7)
           .text('Scan to Pay', qrX + 35, footerY + 85, { 
             width: 60,
             align: 'center'
           });
      }
    }

    // Authorized Signature
    doc.fillColor(colors.primary)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('AUTHORIZED SIGNATURE', signX, footerY);

    if (shopProfile?.sign_url) {
      const signPath = path.resolve(process.cwd(), shopProfile.sign_url);
      if (fs.existsSync(signPath)) {
        doc.image(signPath, signX + 10, footerY + 20, { 
          width: footerColWidth - 30,
          height: 40,
          fit: [footerColWidth - 30, 40]
        });
      }
    }

    // Terms and Conditions / Footer Note
    doc.fillColor(colors.secondary)
       .fontSize(7)
       .font('Helvetica-Oblique')
       .text(
         'This is a computer-generated invoice and does not require a signature.',
         margin,
         pageHeight - 25,
         { width: usableWidth, align: 'center' }
       );

    // Add page numbers if multiple pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(colors.secondary)
         .fontSize(7)
         .text(
           `Page ${i + 1} of ${pages.count}`,
           margin,
           pageHeight - 40,
           { width: usableWidth, align: 'right' }
         );
    }

    doc.end();

  } catch (err) {
    console.error('PDF Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Helper function: Convert number to words (Indian numbering system)
function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }
  
  // Handle decimal part (paise)
  const [rupees, paise] = num.toFixed(2).split('.').map(Number);
  
  let result = '';
  
  if (rupees >= 10000000) {
    result += convertLessThanThousand(Math.floor(rupees / 10000000)) + ' Crore ';
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    result += convertLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    result += convertLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
    rupees %= 1000;
  }
  if (rupees > 0) {
    result += convertLessThanThousand(rupees);
  }
  
  result = 'Rupees ' + result.trim();
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result;
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
