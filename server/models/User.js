const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User',
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
  }],
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopProfile',
    required: true
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate JWT
userSchema.methods.generateAuthToken = async function () {
  await this.populate('permissions');
  return jwt.sign({ id: this._id, name: this.name, role: this.role, permissions: this.permissions.map(p => p.name), shop: this.shop }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Method to generate Refresh Token
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
