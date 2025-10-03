// components/InvoiceList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const InvoiceList = ({ suppliers = [], invoices, setInvoices }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/invoices`)
      .then(response => {
        setInvoices(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('There was an error fetching the invoices!', error);
        setLoading(false);
      });
  }, [setInvoices]);

  const getPaymentStatusCounts = (items, statusField) => {
    return items.reduce((acc, item) => {
      acc[item[statusField]] = (acc[item[statusField]] || 0) + 1;
      return acc;
    }, {});
  };

  const supplierStatusCounts = getPaymentStatusCounts(invoices, 'paymentStatus');

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-2xl font-semibold text-gray-800">Purchase Invoices</h3>
          <div className="flex space-x-4">
            <Link
              to="/invoices/add"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md text-sm font-medium"
            >
              + Add Invoice
            </Link>
            <div className="flex space-x-4 text-base font-medium">
              <span className="text-green-600">Paid: {supplierStatusCounts.Paid || 0}</span>
              <span className="text-red-600">Unpaid: {supplierStatusCounts.Unpaid || 0}</span>
              <span className="text-yellow-600">Partial: {supplierStatusCounts.Partial || 0}</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">S.no</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Due Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Payment Mode</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length > 0 ? (
                invoices.map((invoice,i) => {
                  const dueAmount = invoice.amount - (invoice.paidAmount || 0);
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i+1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice._id.slice(-5)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.supplierId?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(invoice.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(invoice.paidAmount ||invoice.paymentStatus==="partial"?invoice.paidAmount:invoice.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(dueAmount || invoice.paymentStatus==="paid"?0:0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.paymentStatus === 'Paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.paymentStatus === 'Unpaid'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.paymentMode}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No invoices added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;