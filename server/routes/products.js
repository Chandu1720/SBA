const express = require('express');
const Joi = require('joi');
const router = express.Router();
const Product = require('../models/Product');
const { getNextSequence } = require('../utils/numberGenerator'); // 💡 Import the sequence generator
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Joi schema for product validation
// 💡 We remove sku and product_id as they are generated server-side
const productSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().allow(''),
  category: Joi.string().trim().allow(''),
  productType: Joi.string().trim().allow(''),
  brand: Joi.string().trim().allow(''),
  barcode: Joi.string().trim().allow(''),
  price: Joi.number().min(0).required(),
  costPrice: Joi.number().min(0).default(0),
  quantity: Joi.number().min(0).required(),
  minStockLevel: Joi.number().min(0).default(0),
  unitType: Joi.string().trim().required(),
  taxRate: Joi.number().min(0).max(100).default(0),
  taxType: Joi.string().valid('GST', 'VAT', 'None').default('GST'),
  supplier: Joi.string().hex().length(24).allow(null),
  image: Joi.string().trim().allow(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
  shop: Joi.string().hex().length(24).required()
});

// GET all products
router.get('/', auth, authorize('products:view'), async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).send('Shop ID is required.');
    }
    const products = await Product.find({ shop }).sort({ createdAt: -1 });
    res.send(products);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// GET product by ID
router.get('/:id', auth, authorize('products:view'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found.');
    res.send(product);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// POST create a new product
router.post('/', auth, authorize('products:create'), async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // 💡 Manually generate SKU
    const productId = await getNextSequence('product');

    const toCode = (str, len = 2) => {
      if (!str) return 'XX'.padEnd(len, 'X').substring(0, len);
      return str.toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(len, 'X').substring(0, len);
    };

    const catCode = toCode(req.body.category, 2);
    const brandCode = toCode(req.body.brand, 2);
    const seq = String(productId).padStart(5, '0');
    const sku = `${catCode}-${brandCode}-${seq}`;

    let product = new Product({
      ...req.body,
      product_id: productId, // Set generated ID
      sku: sku,             // Set generated SKU
      createdBy: req.user.id,
    });

    await product.save();
    res.status(201).send(product);
  } catch (error) {
    // 💡 More specific error for duplicate SKU
    if (error.code === 11000 && error.keyPattern && (error.keyPattern.sku || error.keyPattern.product_id)) {
      return res.status(409).send('SKU or Product ID conflict. Please try again.');
    }
    res.status(500).send('Server error: ' + error.message);
  }
});

// PUT update an existing product
// 💡 Note: This does not update the SKU. SKU is considered immutable.
router.put('/:id', auth, authorize('products:update'), async (req, res) => {
  try {
    // 💡 We use a different schema for update if SKU/product_id shouldn't be changed
    const { error } = productSchema.validate(req.body); 
    if (error) return res.status(400).send(error.details[0].message);

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).send('Product not found.');
    res.send(product);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// DELETE a product
router.delete('/:id', auth, authorize('products:delete'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).send('Product not found.');
    res.send(product);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

module.exports = router;