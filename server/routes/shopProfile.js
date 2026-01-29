const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // For file system operations
const ShopProfile = require('../models/ShopProfile');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    // Ensure the uploads directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, 'shop-logo' + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('logo'); // 'logo' is the field name for the file input

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// @route   GET /api/shop-profile
// @desc    Get shop profile
// @access  Private (Admin)
router.get('/', [auth, authorize(['shop-profile:view'])], async (req, res) => {
  try {
    const shopProfile = await ShopProfile.findOne();
    if (!shopProfile) {
      return res.status(404).json({ message: 'Shop profile not found' });
    }
    res.json(shopProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/shop-profile
// @desc    Create or update shop profile
// @access  Private (Admin)
router.post('/', [auth, authorize(['shop-profile:edit'])], (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    }

    try {
      const { shop_name, gstin, address, phone_number } = req.body;
      let shopProfile = await ShopProfile.findOne();

      if (shopProfile) {
        // Update existing profile
        shopProfile.shop_name = shop_name || shopProfile.shop_name;
        shopProfile.gstin = gstin || shopProfile.gstin;
        shopProfile.address = address || shopProfile.address;
        shopProfile.phone_number = phone_number || shopProfile.phone_number;
        if (req.file) {
          // If a new logo is uploaded, delete the old one if it exists
          if (shopProfile.logo_url) {
            const oldLogoPath = path.join(__dirname, '..', shopProfile.logo_url);
            if (fs.existsSync(oldLogoPath)) {
              fs.unlinkSync(oldLogoPath);
            }
          }
          shopProfile.logo_url = `/uploads/${req.file.filename}`;
        }
        await shopProfile.save();
        res.json(shopProfile);
      } else {
        // Create new profile
        if (!shop_name || !gstin || !address || !phone_number) {
          return res.status(400).json({ message: 'Please enter all required fields' });
        }
        shopProfile = new ShopProfile({
          shop_name,
          gstin,
          address,
          phone_number,
          logo_url: req.file ? `/uploads/${req.file.filename}` : '',
        });
        await shopProfile.save();
        res.status(201).json(shopProfile);
      }
    } catch (err) {
      console.error(err.message);
      // If there's an error after file upload, delete the uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send('Server Error');
    }
  });
});

module.exports = router;