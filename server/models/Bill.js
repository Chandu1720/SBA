const mongoose = require('mongoose');

// const lineItemSchema = new mongoose.Schema({
//   itemType: {
//     type: String,
//     required: true,
//     enum: ['Simple', 'Product', 'Kit']
//   },
//   // For 'Simple' items, the name is stored directly.
//   name: {
//     type: String,
//     // Not required if it's a Product or Kit, as the name will be populated.
//     required: function() { return this.itemType === 'Simple'; }
//   },
//   // For 'Product' and 'Kit' items, we store a reference.
//   itemId: {
//     type: mongoose.Schema.Types.ObjectId,
//     refPath: 'itemModel',
//     required: function() { return this.itemType !== 'Simple'; }
//   },
//   itemModel: {
//     type: String,
//     enum: ['Product', 'Kit'],
//     required: function() { return this.itemType !== 'Simple'; }
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   rate: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   total: {
//     type: Number,
//     required: true,
//     min: 0
//   }
// }, { _id: false });
const lineItemSchema = new mongoose.Schema({
  itemType: { type: String, required: true, enum: ['Simple', 'Product', 'Kit'] },
  name: { type: String, required: function() { return this.itemType === 'Simple'; } },
  itemId: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.itemModel' },
  itemModel: { type: String, enum: ['Product', 'Kit'] },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, 
  total: { type: Number, required: true ,min:0 }
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    unique: true,
  },
  customerName: String,
  customerPhone: String,
  billDate: {
    type: Date,
    default: Date.now
  },
  items: [lineItemSchema],
  grandTotal: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    default: 'Pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentMode: String,
  notes: String,
  billCopy: String, // Path to an uploaded copy of the bill
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopProfile',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
