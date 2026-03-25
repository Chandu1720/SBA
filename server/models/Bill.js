// const mongoose = require('mongoose');

// // const lineItemSchema = new mongoose.Schema({
// //   itemType: {
// //     type: String,
// //     required: true,
// //     enum: ['Simple', 'Product', 'Kit']
// //   },
// //   // For 'Simple' items, the name is stored directly.
// //   name: {
// //     type: String,
// //     // Not required if it's a Product or Kit, as the name will be populated.
// //     required: function() { return this.itemType === 'Simple'; }
// //   },
// //   // For 'Product' and 'Kit' items, we store a reference.
// //   itemId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     refPath: 'itemModel',
// //     required: function() { return this.itemType !== 'Simple'; }
// //   },
// //   itemModel: {
// //     type: String,
// //     enum: ['Product', 'Kit'],
// //     required: function() { return this.itemType !== 'Simple'; }
// //   },
// //   quantity: {
// //     type: Number,
// //     required: true,
// //     min: 0
// //   },
// //   rate: {
// //     type: Number,
// //     required: true,
// //     min: 0
// //   },
// //   total: {
// //     type: Number,
// //     required: true,
// //     min: 0
// //   }
// // }, { _id: false });
// const lineItemSchema = new mongoose.Schema({
//   itemType: { type: String, required: true, enum: ['Simple', 'Product', 'Kit'] },
//   name: { type: String, required: function() { return this.itemType === 'Simple'; } },
//   itemId: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.itemModel' },
//   itemModel: { type: String, enum: ['Product', 'Kit'] },
//   quantity: { type: Number, required: true },
//   rate: { type: Number, required: true },
//   taxRate: { type: Number, default: 0 }, 
//   total: { type: Number, required: true ,min:0 }
// }, { _id: false });

// const billSchema = new mongoose.Schema({
//   billNumber: {
//     type: String,
//     unique: true,
//   },
//   customerName: String,
//   customerPhone: String,
//   billDate: {
//     type: Date,
//     default: Date.now
//   },
//   items: [lineItemSchema],
//   grandTotal: {
//     type: Number,
//     required: true
//   },
//   paymentStatus: {
//     type: String,
//     default: 'Pending'
//   },
//   paidAmount: {
//     type: Number,
//     default: 0
//   },
//   paymentMode: String,
//   notes: String,
//   billCopy: String, // Path to an uploaded copy of the bill
//   shop: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'ShopProfile',
//     required: true
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   }
// }, { timestamps: true });

// const Bill = mongoose.model('Bill', billSchema);

// module.exports = Bill;

const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  itemType: { type: String, required: true, enum: ['Simple', 'Product', 'Kit'] },
  name: { type: String, required: function() { return this.itemType === 'Simple'; } },
  itemId: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.itemModel' },
  itemModel: { type: String, enum: ['Product', 'Kit'] },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },

  // Line-item level discount
  discountType: { type: String, enum: ['Percentage', 'Flat'], default: 'Flat' },
  discountValue: { type: Number, default: 0, min: 0 },  // % or flat amount
  discountAmount: { type: Number, default: 0, min: 0 }, // computed discount in ₹

  total: { type: Number, required: true, min: 0 } // after discount + tax
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  customerName: String,
  customerPhone: String,
  billDate: { type: Date, default: Date.now },
  items: [lineItemSchema],

  subTotal: { type: Number, default: 0 },          // sum of (rate × qty) before any discount/tax

  // Bill-level discount (applied after line items)
  billDiscountType: { type: String, enum: ['Percentage', 'Flat'], default: 'Flat' },
  billDiscountValue: { type: Number, default: 0, min: 0 },
  billDiscountAmount: { type: Number, default: 0, min: 0 }, // computed

  totalTax: { type: Number, default: 0 },          // total tax across all items
  grandTotal: { type: Number, required: true },     // subTotal - discounts + tax

  paymentStatus: { type: String, default: 'Pending' },
  paidAmount: { type: Number, default: 0 },
  paymentMode: String,
  notes: String,
  billCopy: String,
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopProfile', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
// ```

// **What was added and why:**

// **Line-item level:**
// - `discountType` — whether the discount is a `Percentage` (e.g. 10%) or a `Flat` amount (e.g. ₹50)
// - `discountValue` — the raw input value (10 for 10%, or 50 for ₹50)
// - `discountAmount` — the computed discount in rupees, store this so you don't recalculate every time
// - `total` now represents the final amount after applying per-item discount and tax

// **Bill level:**
// - `subTotal` — sum of `rate × quantity` across all items, before any discount or tax
// - `billDiscountType` / `billDiscountValue` / `billDiscountAmount` — same pattern as line-item but applied to the whole bill (useful for coupons, loyalty discounts, etc.)
// - `totalTax` — aggregated tax across all line items, handy for GST breakdowns

// **Calculation flow to use in your controller:**
// ```
// discountAmount  = discountType === 'Percentage'
//                     ? (rate × quantity × discountValue / 100)
//                     : discountValue

// itemTotal       = (rate × quantity) - discountAmount + taxAmount

// subTotal        = sum of all (rate × quantity)
// billDiscount    = billDiscountType === 'Percentage'
//                     ? (subTotal × billDiscountValue / 100)
//                     : billDiscountValue

// grandTotal      = subTotal - billDiscountAmount + totalTax
