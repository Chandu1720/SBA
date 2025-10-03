// components/BillForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const BillForm = ({ bills, setBills }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [billForm, setBillForm] = useState({
    customerName: '',
    customerPhone: '',
    billDate: '',
    items: [{ name: '', quantity: 1, rate: 0, total: 0 }],
    grandTotal: 0,
    paymentStatus: 'Unpaid',
    paidAmount: '',
    paymentMode: 'Cash',
    notes: '',
    billCopy: null
  });

  // Load bill data if editing
  useEffect(() => {
    if (isEditMode) {
      const bill = bills.find(b => b._id === id);
      if (bill) {
        setBillForm({
          ...bill,
          billDate: new Date(bill.billDate).toISOString().split('T')[0],
        });
      } else {
        // Fallback: fetch from API
        axios.get(`${process.env.REACT_APP_API_URL}/api/bills/${id}`)
          .then(response => {
            const b = response.data;
            setBillForm({
              ...b,
              billDate: new Date(b.billDate).toISOString().split('T')[0],
            });
          })
          .catch(error => {
            console.error('Error fetching bill for edit', error);
            navigate('/bills');
          });
      }
    }
  }, [id, isEditMode, bills, navigate]);

  const handleBillChange = (e) => {
    setBillForm({
      ...billForm,
      [e.target.name]: e.target.value
    });
  };

  const handleBillFileChange = (e) => {
    setBillForm({
      ...billForm,
      billCopy: e.target.files[0]
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billForm.items];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].rate;
    }
    const newGrandTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setBillForm({
      ...billForm,
      items: updatedItems,
      grandTotal: newGrandTotal
    });
  };

  const addItem = () => {
    setBillForm({
      ...billForm,
      items: [...billForm.items, { name: '', quantity: 1, rate: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const updatedItems = billForm.items.filter((_, i) => i !== index);
    const newGrandTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setBillForm({
      ...billForm,
      items: updatedItems,
      grandTotal: newGrandTotal
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const billData = {
      ...billForm,
      grandTotal: Number(billForm.grandTotal),
      paidAmount: Number(billForm.paidAmount),
    };

    if (isEditMode) {
      axios.put(`${process.env.REACT_APP_API_URL}/api/bills/${id}`, billData)
        .then(response => {
          setBills(bills.map(b => (b._id === id ? response.data : b)));
          navigate('/bills');
        })
        .catch(error => {
          console.error('There was an error updating the bill!', error);
        });
    } else {
      axios.post(`${process.env.REACT_APP_API_URL}/api/bills`, billData)
        .then(response => {
          setBills([...bills, response.data]);
          navigate('/bills');
        })
        .catch(error => {
          console.error('There was an error adding the bill!', error);
        });
    }
  };

  const pageTitle = isEditMode ? 'Edit Customer Bill' : 'Add New Customer Bill';

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">{pageTitle}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={billForm.customerName}
                onChange={handleBillChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Phone
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={billForm.customerPhone}
                onChange={handleBillChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="billDate"
                value={billForm.billDate}
                onChange={handleBillChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-green-600 text-white px-5 py-2 rounded-md text-sm hover:bg-green-700 transition-colors duration-200 shadow-md"
              >
                Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Item Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billForm.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition duration-200"
                          required
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition duration-200"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition duration-200"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-800 font-medium">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {billForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium transition duration-200"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-right">
              <div className="text-2xl font-bold text-gray-900">
                Grand Total: ₹{billForm.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Additional Bill Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                name="paymentStatus"
                value={billForm.paymentStatus}
                onChange={handleBillChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            {billForm.paymentStatus === 'Partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Amount
                </label>
                <input
                  type="number"
                  name="paidAmount"
                  value={billForm.paidAmount}
                  onChange={handleBillChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode
              </label>
              <select
                name="paymentMode"
                value={billForm.paymentMode}
                onChange={handleBillChange}
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
                value={billForm.notes}
                onChange={handleBillChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Bill Copy (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleBillFileChange}
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
              {isEditMode ? 'Update Bill' : 'Add Bill'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/bills')}
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

export default BillForm;