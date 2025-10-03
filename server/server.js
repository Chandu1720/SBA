require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bms";
// require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET); // 👈 ADD THIS
console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    if (!process.env.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is not defined. Please set this environment variable.');
      process.exit(1); // Exit the process if JWT_SECRET is not set
    }
  })
  .catch(err => console.error(err));

// Schemas and Models
const Supplier = require('./models/Supplier');

const invoiceSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  invoiceDate: Date,
  dueDate: Date,
  amount: Number,
  paymentStatus: String,
  paidAmount: { type: Number, default: 0 },
  paymentMode: String,
  notes: String,
  invoiceCopy: String,
});
const Invoice = mongoose.model('Invoice', invoiceSchema);

const billSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  billDate: Date,
  items: [{
    name: String,
    quantity: Number,
    rate: Number,
    total: Number,
  }],
  grandTotal: Number,
  paymentStatus: String,
  paidAmount: { type: Number, default: 0 },
  paymentMode: String,
  notes: String,
  billCopy: String,
});
const Bill = mongoose.model('Bill', billSchema);
const User = require('./models/User');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const supplier = new Supplier(req.body);
  try {
    const newSupplier = await supplier.save();
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSupplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Supplier.findByIdAndDelete(id);
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('supplierId');
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = new Invoice(req.body);
  try {
    const newInvoice = await invoice.save();
    const populatedInvoice = await Invoice.findById(newInvoice._id).populate('supplierId');
    res.status(201).json(populatedInvoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).populate('supplierId');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    console.error(`Error fetching invoice ${id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating invoice ${id} with data:`, req.body);
    const updatedInvoice = await Invoice.findByIdAndUpdate(id, req.body, { new: true }).populate('supplierId');
    res.json(updatedInvoice);
  } catch (err) {
    console.error(`Error updating invoice ${id}:`, err);
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Invoice.findByIdAndDelete(id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/bills', async (req, res) => {
  const bill = new Bill(req.body);
  try {
    const newBill = await bill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (err) {
    console.error(`Error fetching bill ${id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating bill ${id} with data:`, req.body);
    const updatedBill = await Bill.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedBill);
  } catch (err) {
    console.error(`Error updating bill ${id}:`, err);
    res.status(400).json({ message: err.message });
  }
});

// Due Management
app.get('/api/dues/suppliers', async (req, res) => {
  try {
    const dueInvoices = await Invoice.find({ paymentStatus: { $ne: 'Paid' } }).populate('supplierId');
    res.json(dueInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/dues/customers', async (req, res) => {
  try {
    const dueBills = await Bill.find({ paymentStatus: { $ne: 'Paid' } });
    res.json(dueBills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/dues/suppliers', async (req,res) => {
  try {
    await Invoice.updateMany({ paymentStatus: { $ne: 'Paid' } }, { paymentStatus: 'Paid' });
    res.json({ message: 'Supplier dues cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/dues/customers', async (req, res) => {
  try {
    await Bill.updateMany({ paymentStatus: { $ne: 'Paid' } }, { paymentStatus: 'Paid' });
    res.json({ message: 'Customer dues cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});