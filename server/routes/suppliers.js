const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   GET api/suppliers
// @desc    Get all suppliers with pagination and search
// @access  Private
router.get('/', [auth, authorize(['suppliers:view'])], async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const suppliers = await Supplier.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Supplier.countDocuments(query);

    res.json({
      suppliers,
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

// @route   GET api/suppliers/:id
// @desc    Get supplier by ID
// @access  Private
router.get('/:id', [auth, authorize(['suppliers:view'])], async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/suppliers
// @desc    Create a supplier
// @access  Private (Admin only)
router.post('/', [auth, authorize(['suppliers:create'])], async (req, res) => {
  const { name, contactPerson, phone, email, address, gstId, notes } = req.body;

  try {
    const newSupplier = new Supplier({
      name,
      contactPerson,
      phone,
      email,
      address,
      gstId,
      notes,
    });

    const supplier = await newSupplier.save();
    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/suppliers/:id
// @desc    Update a supplier
// @access  Private (Admin only)
router.put('/:id', [auth, authorize(['suppliers:edit'])], async (req, res) => {
  const { name, contactPerson, phone, email, address, gstId, notes } = req.body;

  const supplierFields = { name, contactPerson, phone, email, address, gstId, notes };

  try {
    let supplier = await Supplier.findById(req.params.id);

    if (!supplier) return res.status(404).json({ msg: 'Supplier not found' });

    supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: supplierFields },
      { new: true }
    );

    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/suppliers/:id
// @desc    Delete a supplier
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize(['suppliers:delete'])], async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ msg: 'Supplier not found' });
    }

    await supplier.remove();

    res.json({ msg: 'Supplier removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Supplier not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
