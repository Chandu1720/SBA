const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  kit_id: {
    type: Number,
    unique: true,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
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

// Pre-save hook to auto-calculate price if not provided
kitSchema.pre('save', async function(next) {
  if (!this.price || this.price === 0) {
    // Auto-calculate price from products
    try {
      // Check if products array has valid product references
      if (this.products && this.products.length > 0) {
        await this.populate('products.product');
        const totalPrice = this.products.reduce((sum, item) => {
          const productPrice = (item.product && item.product.price) || 0;
          return sum + (productPrice * (item.quantity || 1));
        }, 0);
        if (totalPrice > 0) {
          this.price = totalPrice;
        }
      }
    } catch (error) {
      // If population fails, keep default price
      this.price = this.price || 0;
    }
  }
  next();
});

module.exports = mongoose.model('Kit', kitSchema);
