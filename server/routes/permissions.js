const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   GET api/permissions
// @desc    Get all permissions
// @access  Private (Admin only)
router.get('/', [auth, authorize(['admin'])], async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/:id/permissions
// @desc    Get a user's permissions
// @access  Private (Admin only)
router.get('/users/:id/permissions', [auth, authorize(['admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('permissions');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.permissions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/:id/permissions
// @desc    Update a user's permissions
// @access  Private (Admin only)
router.put('/users/:id/permissions', [auth, authorize(['admin'])], async (req, res) => {
  const { permissions } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.permissions = permissions;
    await user.save();

    const updatedUser = await User.findById(req.params.id).populate('permissions');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
