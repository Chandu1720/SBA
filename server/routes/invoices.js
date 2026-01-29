const express = require('express');
const router = express.Router();
const Joi = require('joi');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { generateNumber } = require('../utils/numberGenerator');

/* ------------------------------------------------------------------
   MULTER CONFIG
------------------------------------------------------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/invoices');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    const isValid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);

    cb(isValid ? null : new Error('Invalid file type'), isValid);
  },
});

// Multer fields config for multiple files
const uploadFields = upload.fields([
  { name: 'invoiceCopy', maxCount: 1 },
  { name: 'paymentProof', maxCount: 1 },
]);

/* ------------------------------------------------------------------
   JOI SCHEMAS
------------------------------------------------------------------- */

const joiInvoiceCreateSchema = Joi.object({
  invoiceNumber: Joi.string(),
  supplierInvoiceNumber: Joi.string().allow('', null),
  supplierId: Joi.string().required(),
  invoiceDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  amount: Joi.number().required(),
  paymentStatus: Joi.string().required(),
  paidAmount: Joi.number().allow(0),
  paymentMode: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  invoiceCopy: Joi.string().allow('', null),
}).unknown(true);

const joiInvoiceUpdateSchema = Joi.object({
  invoiceNumber: Joi.string(),
  supplierInvoiceNumber: Joi.string().allow('', null),
  supplierId: Joi.string(),
  invoiceDate: Joi.date(),
  dueDate: Joi.date(),
  amount: Joi.number(),
  paymentStatus: Joi.string(),
  paidAmount: Joi.number(),
  paymentMode: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  invoiceCopy: Joi.string().allow('', null),
}).unknown(true);


/* ------------------------------------------------------------------
   GET ALL INVOICES
------------------------------------------------------------------- */

router.get('/', [auth, authorize(['invoices:view'])], async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const supplierQuery = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const suppliers = await Supplier.find(supplierQuery);
    const supplierIds = suppliers.map((s) => s._id);

    const query = search
      ? {
          $or: [
            { paymentStatus: { $regex: search, $options: 'i' } },
            { supplierId: { $in: supplierIds } },
          ],
        }
      : {};

    const invoices = await Invoice.find(query)
      .populate('supplierId')
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .exec();

    const count = await Invoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: Number(page),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------------------------------------------
   CREATE INVOICE (WITH FILE UPLOAD)
------------------------------------------------------------------- */

router.post(
  '/',
  [auth, authorize(['invoices:create']), uploadFields],
  async (req, res) => {
    try {
      const invoiceNumber = await generateNumber('invoice');
      
      // Convert FormData strings to correct types
      const data = {
        invoiceNumber,
        supplierInvoiceNumber: req.body.supplierInvoiceNumber || '',
        supplierId: req.body.supplierId,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
        amount: Number(req.body.amount),
        paymentStatus: req.body.paymentStatus,
        paidAmount: req.body.paidAmount ? Number(req.body.paidAmount) : 0,
        paymentMode: req.body.paymentMode || '',
        notes: req.body.notes || '',
        invoiceCopy: req.files?.invoiceCopy?.[0]
          ? `/uploads/invoices/${req.files.invoiceCopy[0].filename}`
          : '',
        paymentProof: req.files?.paymentProof?.[0]
          ? `/uploads/invoices/${req.files.paymentProof[0].filename}`
          : '',
      };

      

      const { error, value } = joiInvoiceCreateSchema.validate(data);
      if (error) {
        
        return res.status(400).json({ 
          message: error.details[0].message,
          details: error.details 
        });
      }

      const invoice = new Invoice(data);
      const saved = await invoice.save();
      const populated = await Invoice.findById(saved._id).populate('supplierId');

      res.status(201).json(populated);
    } catch (err) {
      
      res.status(400).json({ message: err.message });
    }
  }
);

/* ------------------------------------------------------------------
   GET INVOICE BY ID
------------------------------------------------------------------- */

router.get('/:id', [auth, authorize(['invoices:view'])], async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('supplierId');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------
   UPDATE INVOICE (WITH FILE UPLOAD)
------------------------------------------------------------------- */

router.put(
  '/:id',
  [auth, authorize(['invoices:edit']), uploadFields],
  async (req, res) => {
    try {
      // 🔑 Convert FormData strings → correct types
      const data = {
        ...req.body,
        amount: req.body.amount ? Number(req.body.amount) : undefined,
        paidAmount: req.body.paidAmount ? Number(req.body.paidAmount) : undefined,
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };

      // 🔑 If files uploaded, save paths
      if (req.files?.invoiceCopy?.[0]) {
        data.invoiceCopy = `/uploads/invoices/${req.files.invoiceCopy[0].filename}`;
      }
      
      if (req.files?.paymentProof?.[0]) {
        data.paymentProof = `/uploads/invoices/${req.files.paymentProof[0].filename}`;
      }

      // 🔑 Validate AFTER conversion
const { error } = joiInvoiceUpdateSchema.validate(data);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        data,
        { new: true }
      ).populate('supplierId');

      if (!updatedInvoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json(updatedInvoice);
    } catch (err) {
      
      res.status(500).json({ message: err.message });
    }
  }
);

/* ------------------------------------------------------------------
   DOWNLOAD INVOICE FILE
------------------------------------------------------------------- */

router.get(
  '/:id/download',
  [auth, authorize(['invoices:view'])],
  async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      
      if (!invoice || !invoice.invoiceCopy) {
        return res.status(404).json({ message: 'Invoice file not found' });
      }

      const filePath = path.join(__dirname, '..', invoice.invoiceCopy);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }

      // Send file for download
      res.download(filePath, `Invoice-${invoice.invoiceNumber}.pdf`, (err) => {
        if (err) {
          
        }
      });
    } catch (err) {
      
      res.status(500).json({ message: err.message });
    }
  }
);

/* ------------------------------------------------------------------
   VIEW INVOICE FILE
------------------------------------------------------------------- */

router.get(
  '/:id/file',
  [auth, authorize(['invoices:view'])],
  async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      
      if (!invoice || !invoice.invoiceCopy) {
        return res.status(404).json({ message: 'Invoice file not found' });
      }

      const filePath = path.join(__dirname, '..', invoice.invoiceCopy);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }

      // Set proper headers for viewing
      const ext = path.extname(invoice.invoiceCopy).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      
      // Stream the file
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      
      res.status(500).json({ message: err.message });
    }
  }
);

/* ------------------------------------------------------------------
   DELETE INVOICE
------------------------------------------------------------------- */

router.delete(
  '/:id',
  [auth, authorize(['invoices:delete'])],
  async (req, res) => {
    try {
      await Invoice.findByIdAndDelete(req.params.id);
      res.json({ message: 'Invoice deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
