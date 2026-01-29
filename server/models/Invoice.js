const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
  },
  supplierInvoiceNumber: String, // Actual invoice number from supplier
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  invoiceDate: Date,
  dueDate: Date,
  amount: Number,
  paymentStatus: String,
  paidAmount: { type: Number, default: 0 },
  paymentMode: String,
  notes: String,
  invoiceCopy: String, // Path to uploaded invoice file
  paymentProof: String, // Path to uploaded cheque/UPI proof file
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;