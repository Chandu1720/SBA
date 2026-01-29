const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Kit = require('../models/Kit');
const { getNextSequence } = require('../utils/numberGenerator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Joi Schema for Kit validation
const kitProductSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(1).required()
});

const kitSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().allow(''),
  price: Joi.number().min(0).optional().default(0),
  products: Joi.array().items(kitProductSchema).min(1).required(),
  shop: Joi.string().hex().length(24).required()
});

// GET all kits
router.get('/', [auth, authorize(['kits:view'])], async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).send('Shop ID is required.');
    }
    // Populate the product details within the kits
    const kits = await Kit.find({ shop }).populate('products.product', 'name price sku quantity');
    res.send(kits);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// GET kit by ID
router.get('/:id', [auth, authorize(['kits:view'])], async (req, res) => {
  try {
    const kit = await Kit.findById(req.params.id).populate('products.product', 'name price sku quantity');
    if (!kit) return res.status(404).send('Kit not found.');
    res.send(kit);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// POST create a new kit
router.post('/', [auth, authorize(['kits:create'])], async (req, res) => {
  try {
    const { error } = kitSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Generate Kit ID and SKU
    const kitId = await getNextSequence('kit');
    const nameCode = req.body.name.substring(0, 3).toUpperCase().padEnd(3, 'X');
    const seq = String(kitId).padStart(4, '0');
    const sku = `KIT-${nameCode}-${seq}`;

    const newKit = new Kit({
      ...req.body,
      kit_id: kitId,
      sku: sku,
      createdBy: req.user.id
    });

    await newKit.save();
    res.status(201).send(newKit);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send('A kit with this name or SKU already exists.');
    }
    res.status(500).send('Server error: ' + error.message);
  }
});

// PUT update an existing kit
router.put('/:id', [auth, authorize(['kits:edit'])], async (req, res) => {
  try {
    const { error } = kitSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const updatedKit = await Kit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedKit) return res.status(404).send('Kit not found.');

    res.send(updatedKit);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send('A kit with this name already exists.');
    }
    res.status(500).send('Server error: ' + error.message);
  }
});

// DELETE a kit
router.delete('/:id', [auth, authorize(['kits:delete'])], async (req, res) => {
  try {
    const deletedKit = await Kit.findByIdAndDelete(req.params.id);
    if (!deletedKit) return res.status(404).send('Kit not found.');
    res.send({ message: 'Kit deleted successfully.' });
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

module.exports = router;
