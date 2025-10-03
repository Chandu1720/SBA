// components/InvoiceForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const InvoiceForm = ({ suppliers = [], invoices, setInvoices }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '',
    invoiceDate: '',
    dueDate: '',
    amount: '',
    paymentStatus: 'Unpaid',
    paidAmount: '',
    paymentMode: 'Cash',
    notes: '',
    invoiceCopy: null
  });

  // If editing, pre-fill form
  useEffect(() => {
    if (isEditMode) {
      const invoice = invoices.find(inv => inv._id === id);
      if (invoice) {
        setInvoiceForm({
          ...invoice,
          // Ensure dates are in YYYY-MM-DD format for input[type="date"]
          invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
          dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
        });
      } else {
        // Fallback: fetch from API if not in local state
        axios.get(`/api/invoices/${id}`)
          .then(response => {
            const inv = response.data;
            setInvoiceForm({
              ...inv,
              invoiceDate: new Date(inv.invoiceDate).toISOString().split('T')[0],
              dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
            });
          })
          .catch(error => {
            console.error('Error fetching invoice for edit', error);
            navigate('/invoices');
          });
      }
    }
  }, [id, isEditMode, invoices, navigate]);

const handleInvoiceChange = (e) => {
  const { name, value } = e.target;

  let updatedForm = {
    ...invoiceForm,
    [name]: value,
  };

  if (name === "paymentStatus") {
    if (value === "Paid") {
      updatedForm.paidAmount = invoiceForm.amount; // auto-fill with invoice amount
    } else if (value === "Unpaid") {
      updatedForm.paidAmount = 0; // unpaid means 0 paid
    } else if (value === "Partial") {
      updatedForm.paidAmount = ""; // allow user to enter manually
    }
  }

  if (name === "amount" && invoiceForm.paymentStatus === "Paid") {
    // Keep paidAmount in sync when amount changes
    updatedForm.paidAmount = value;
  }

  setInvoiceForm(updatedForm);
};

  const handleInvoiceFileChange = (e) => {
    setInvoiceForm({
      ...invoiceForm,
      invoiceCopy: e.target.files[0]
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const invoiceData = {
      ...invoiceForm,
      amount: Number(invoiceForm.amount),
      paidAmount: Number(invoiceForm.paidAmount),
    };

    if (isEditMode) {
      // Update invoice
      axios.put(`/api/invoices/${id}`, invoiceData)
        .then(response => {
          setInvoices(invoices.map(inv => (inv._id === id ? response.data : inv)));
          navigate('/invoices');
        })
        .catch(error => {
          console.error('There was an error updating the invoice!', error);
        });
    } else {
      // Add new invoice
      axios.post(`/api/invoices`, invoiceData)
        .then(response => {
          setInvoices([...invoices, response.data]);
          navigate('/invoices');
        })
        .catch(error => {
          console.error('There was an error adding the invoice!', error);
        });
    }
  };

  const pageTitle = isEditMode ? 'Edit Invoice' : 'Add New Purchase Invoice';

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">{pageTitle}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                name="supplierId"
                value={invoiceForm.supplierId}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={invoiceForm.invoiceDate}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dueDate"
                value={invoiceForm.dueDate}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={invoiceForm.amount}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                name="paymentStatus"
                value={invoiceForm.paymentStatus}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            {/* Paid Amount (shown when status is Paid or Partial) */}
{(invoiceForm.paymentStatus === 'Partial' || invoiceForm.paymentStatus === 'Paid') && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Paid Amount
    </label>
    <input
      type="number"
      name="paidAmount"
      value={invoiceForm.paidAmount}
      onChange={handleInvoiceChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-transparent transition duration-200"
      min="0"
      step="0.01"
      disabled={invoiceForm.paymentStatus === 'Paid'} // disable if auto-filled
    />
  </div>
)}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode
              </label>
              <select
                name="paymentMode"
                value={invoiceForm.paymentMode}
                onChange={handleInvoiceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={invoiceForm.notes}
                onChange={handleInvoiceChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Invoice Copy (PDF/Image)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInvoiceFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>
          <div className="mt-8 flex space-x-4">
            <button
              type="submit"
              className={`${
                isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-6 py-3 rounded-md transition-colors duration-200 shadow-md text-lg`}
            >
              {isEditMode ? 'Update Invoice' : 'Add Invoice'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors duration-200 shadow-md text-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;