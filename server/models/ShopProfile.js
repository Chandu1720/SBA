const mongoose = require('mongoose');

const shopProfileSchema = new mongoose.Schema({
  shop_name: {
    type: String,
    required: true,
    trim: true,
  },
  gstin: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
  },
  logo_url: {
    type: String,
    default: '',
  },
  bankDetails: {
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    bankName: { type: String, trim: true },
  },
  qrCodePath: {
    type: String,
    default: '',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

const ShopProfile = mongoose.model('ShopProfile', shopProfileSchema);

module.exports = ShopProfile;
