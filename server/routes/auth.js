const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Permission = require('../models/Permission');
const ShopProfile = require('../models/ShopProfile');

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let permissions = [];
    if (role === 'Admin') {
      permissions = await Permission.find({});
    }

    // Find the first shop profile to associate with the user
    const shopProfile = await ShopProfile.findOne();
    if (!shopProfile) {
      return res.status(400).json({ message: 'No shop profile found to associate with the user.' });
    }

    user = new User({ name, email, password, role, permissions: permissions.map(p => p._id), shop: shopProfile._id });
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const accessToken = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    

    res.cookie('refreshToken', refreshToken, cookieOptions);
    
    
    res.json({ token: accessToken });
  } catch (err) {
    
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Refresh Token
router.post('/refresh-token', async (req, res) => {
  
  
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    
    return res.status(401).json({ message: 'Refresh token not found.' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.id);

    if (!user) {
      
      return res.status(403).json({ message: 'Invalid refresh token.' });
    }

    const newAccessToken = await user.generateAuthToken();
    
    res.json({ token: newAccessToken });

  } catch (err) {
    
    return res.status(403).json({ message: 'Invalid refresh token.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;
