import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DueManager = () => {
  const [activeTab, setActiveTab] = useState('supplierDues');
  const [supplierDues, setSupplierDues] = useState([]);
  const [customerDues, setCustomerDues] = useState([]);

  const fetchDues = useCallback(() => {
    if (activeTab === 'supplierDues') {
      axios.get(`/api/dues/suppliers`)
        .then(response => {
          console.log('Supplier Dues:', response.data);
          setSupplierDues(response.data);
        })
        .catch(error => {
          console.error('There was an error fetching the supplier dues!', error);
        });
    } else if (activeTab === 'customerDues') {
      axios.get(`/api/dues/customers`)
        .then(response => {
          console.log('Customer Dues:', response.data);
          setCustomerDues(response.data);
        })
        .catch(error => {
          console.error('There was an error fetching the customer dues!', error);
        });
    }
  }, [activeTab, setSupplierDues, setCustomerDues]);

const handleClear = async (id, type) => {
  try {
    if (type === 'supplier') {
      // First fetch the invoice so we know the total amount
      const { data: invoice } = await axios.get(`/api/invoices/${id}`);
      
      await axios.put(`/api/invoices/${id}`, {
        paymentStatus: 'Paid',
        paidAmount: invoice.amount,  // set paidAmount equal to full amount
      });
    } else if (type === 'customer') {
      // Fetch the bill so we know the total
      const { data: bill } = await axios.get(`/api/bills/${id}`);
      
      await axios.put(`/api/bills/${id}`, {
        paymentStatus: 'Paid',
        paidAmount: bill.grandTotal,  // set paidAmount equal to total bill
      });
    }
    fetchDues(); // refresh UI
  } catch (error) {
    console.error(`There was an error clearing the due!`, error);
  }
};


 const handleClearDues = async (type) => {
  try {
    if (type === 'supplier') {
      await Promise.all(
        supplierDues.map(async (invoice) => {
          await axios.put(`/api/invoices/${invoice._id}`, {
            paymentStatus: 'Paid',
            paidAmount: invoice.amount,
          });
        })
      );
    } else if (type === 'customer') {
      await Promise.all(
        customerDues.map(async (bill) => {
          await axios.put(`/api/bills/${bill._id}`, {
            paymentStatus: 'Paid',
            paidAmount: bill.grandTotal,
          });
        })
      );
    }
    fetchDues();
  } catch (error) {
    console.error(`There was an error clearing the ${type} dues!`, error);
  }
};


  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <nav className="-mb-px flex flex-wrap justify-center sm:justify-start sm:space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('supplierDues')}
              className={`${activeTab === 'supplierDues' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-4 sm:px-1 border-b-2 font-medium text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              Dues for Suppliers
            </button>
            <button
              onClick={() => setActiveTab('customerDues')}
              className={`${activeTab === 'customerDues' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-4 sm:px-1 border-b-2 font-medium text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              Dues from Customers
            </button>
          </nav>
        </div>

        {activeTab === 'supplierDues' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Dues for Suppliers</h3>
              <button
                onClick={() => handleClearDues('supplier')}
                className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear All Dues
              </button>
            </div>
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierDues.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">No supplier dues found.</td>
                    </tr>
                  ) : (supplierDues.map(invoice => (
                    <tr key={invoice._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice._id.slice(-5)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.supplierId ? invoice.supplierId.name : 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{(invoice.amount - (invoice.paidAmount || 0)).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                          invoice.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleClear(invoice._id, 'supplier')}
                          className="bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customerDues' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Dues from Customers</h3>
              <button
                onClick={() => handleClearDues('customer')}
                className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear All Dues
              </button>
            </div>
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerDues.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">No customer dues found.</td>
                    </tr>
                  ) : (customerDues.map(bill => (
                    <tr key={bill._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill._id.slice(-5)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bill.billDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{(bill.grandTotal - (bill.paidAmount || 0)).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                          bill.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleClear(bill._id, 'customer')}
                          className="bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DueManager;