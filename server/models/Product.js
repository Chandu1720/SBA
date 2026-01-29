const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sku: { // This is the unique product code
    type: String,
    unique: true,
    required: true
  },
  product_id: { // This will be our manually managed sequence
    type: Number,
    unique: true,
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  productType: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    min: 0,
    default: 0
  },
  unitType: {
    type: String,
    required: true,
    trim: true
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  taxType: {
    type: String,
    enum: ['GST', 'VAT', 'None'],
    default: 'GST'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  image: {
    type: String, // URL or path to product image
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopProfile',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
