const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ShopProfile = require('../models/ShopProfile');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage for multer to handle file as a buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('logo');

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Helper to upload file buffer to Cloudinary
const handleUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'bms_shop_logos' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// @route   GET /api/shop-profile
// @desc    Get shop profile
// @access  Private (Admin)
router.get('/', [auth, authorize(['shop-profile:view'])], async (req, res) => {
  try {
    const shopProfile = await ShopProfile.findOne();
    if (!shopProfile) {
      // Return a default or empty profile if none exists
      return res.json({
        shop_name: '',
        gstin: '',
        address: '',
        phone_number: '',
        logo_url: '',
      });
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

      let logoUrl = shopProfile ? shopProfile.logo_url : '';

      // Handle file upload to Cloudinary
      if (req.file) {
        const uploadResult = await handleUpload(req.file.buffer);
        logoUrl = uploadResult.secure_url;

        // If updating and there was an old logo, delete it from Cloudinary
        if (shopProfile && shopProfile.logo_url) {
          try {
            const publicId = shopProfile.logo_url.split('/').pop().split('.')[0];
            const folder = shopProfile.logo_url.split('/').slice(-2, -1)[0];
            if (folder === 'bms_shop_logos') {
               await cloudinary.uploader.destroy(`${folder}/${publicId}`);
            }
          } catch(e) {
            console.error("Error deleting old logo from Cloudinary:", e);
          }
        }
      }

      if (shopProfile) {
        // Update existing profile
        shopProfile.shop_name = shop_name || shopProfile.shop_name;
        shopProfile.gstin = gstin || shopProfile.gstin;
        shopProfile.address = address || shopProfile.address;
        shopProfile.phone_number = phone_number || shopProfile.phone_number;
        shopProfile.logo_url = logoUrl;
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
          logo_url: logoUrl,
        });
        await shopProfile.save();
        res.status(201).json(shopProfile);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
});

module.exports = router;