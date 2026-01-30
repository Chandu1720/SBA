const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { generateNumber } = require('../utils/numberGenerator');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage for multer
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    const isValid = allowed.test(file.mimetype);
    cb(isValid ? null : new Error('Invalid file type'), isValid);
  },
});

// Multer fields config
const uploadFields = upload.fields([
  { name: 'invoiceCopy', maxCount: 1 },
  { name: 'paymentProof', maxCount: 1 },
]);

// Helper to upload file buffer to Cloudinary
const handleUpload = (fileBuffer, originalFilename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'bms_invoices', resource_type: 'auto', public_id: originalFilename },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

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


router.post(
  '/',
  [auth, authorize(['invoices:create']), uploadFields],
  async (req, res) => {
    try {
      const invoiceNumber = await generateNumber('invoice');
      
      const data = {
        invoiceNumber,
        supplierId: req.body.supplierId,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
        amount: Number(req.body.amount),
        paymentStatus: req.body.paymentStatus,
        supplierInvoiceNumber: req.body.supplierInvoiceNumber || '',
        paidAmount: req.body.paidAmount ? Number(req.body.paidAmount) : 0,
        paymentMode: req.body.paymentMode || '',
        notes: req.body.notes || '',
        invoiceCopy: '',
        paymentProof: '',
      };

      // Handle file uploads
      if (req.files) {
        if (req.files.invoiceCopy) {
          const result = await handleUpload(req.files.invoiceCopy[0].buffer, req.files.invoiceCopy[0].originalname);
          data.invoiceCopy = result.secure_url;
        }
        if (req.files.paymentProof) {
          const result = await handleUpload(req.files.paymentProof[0].buffer, req.files.paymentProof[0].originalname);
          data.paymentProof = result.secure_url;
        }
      }

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
      console.error("Error creating invoice:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

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


router.put(
  '/:id',
  [auth, authorize(['invoices:edit']), uploadFields],
  async (req, res) => {
    try {
      const data = { ...req.body };

      // Handle file uploads
      if (req.files) {
        if (req.files.invoiceCopy) {
          const result = await handleUpload(req.files.invoiceCopy[0].buffer, req.files.invoiceCopy[0].originalname);
          data.invoiceCopy = result.secure_url;
        }
        if (req.files.paymentProof) {
          const result = await handleUpload(req.files.paymentProof[0].buffer, req.files.paymentProof[0].originalname);
          data.paymentProof = result.secure_url;
        }
      }
      
      // Type conversions
      if(data.amount) data.amount = Number(data.amount);
      if(data.paidAmount) data.paidAmount = Number(data.paidAmount);
      if(data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate);
      if(data.dueDate) data.dueDate = new Date(data.dueDate);

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
      console.error("Error updating invoice:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

const redirectToCloudinaryUrl = async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice || !invoice.invoiceCopy) {
        return res.status(404).json({ message: 'Invoice file not found' });
      }
      // Redirect to the Cloudinary URL
      res.redirect(302, invoice.invoiceCopy);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
}

router.get('/:id/download', [auth, authorize(['invoices:view'])], redirectToCloudinaryUrl);
router.get('/:id/file', [auth, authorize(['invoices:view'])], redirectToCloudinaryUrl);

router.put(
  '/:id/clear-due',
  [auth, authorize(['invoices:edit'])],
  async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      invoice.paidAmount = invoice.amount;
      invoice.paymentStatus = 'Paid';

      const updatedInvoice = await invoice.save();
      res.json(updatedInvoice);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

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
