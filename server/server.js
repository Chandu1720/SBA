const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Joi = require('joi');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const authorize = require('./middleware/authorize');
const Invoice = require('./models/Invoice');
const Bill = require('./models/Bill');
const auth = require('./middleware/auth');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,bms-1-bne0.onrender.com').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent with requests
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bms";
// require('dotenv').config();



mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    if (!process.env.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is not defined. Please set this environment variable.');
      process.exit(1); // Exit the process if JWT_SECRET is not set
    }
  })
  .catch(err => console.error(err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/shop-profile', require('./routes/shopProfile'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/products', require('./routes/products'));
app.use('/api/bills', require('./routes/bills')); // 💡 Refactored
app.use('/api/kits', require('./routes/kits')); // 💡 Added
app.use('/api/notifications', require('./routes/notifications'));


// Due Management
app.get('/api/dues/suppliers', [auth, authorize(['invoices:view'])], async (req, res) => {
  try {
    const dueInvoices = await Invoice.find({ paymentStatus: { $ne: 'Paid' } }).populate('supplierId');
    res.json(dueInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/dues/customers', [auth, authorize(['bills:view'])], async (req, res) => {
  try {
    const dueBills = await Bill.find({ paymentStatus: { $ne: 'Paid' } });
    res.json(dueBills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const scheduleJobs = require('./utils/cronJobs');

if (process.env.NODE_ENV === 'production') {
  // Serve frontend files
  app.use(express.static(path.join(__dirname, '../bms-frontend-ts/build')));

  // For any other GET request, send the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../bms-frontend-ts/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleJobs();
});
