// components/BillList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BillList = ({ bills, setBills }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/bills`)
      .then(response => {
        setBills(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('There was an error fetching the bills!', error);
        setLoading(false);
      });
  }, [setBills]);

  const getPaymentStatusCounts = (items, statusField) => {
    return items.reduce((acc, item) => {
      acc[item[statusField]] = (acc[item[statusField]] || 0) + 1;
      return acc;
    }, {});
  };

  const billStatusCounts = getPaymentStatusCounts(bills, 'paymentStatus');

  const generateBillPDF = (bill) => {
    const input = document.getElementById(`bill-pdf-${bill._id}`);
    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        pdf.save(`bill-${bill._id}.pdf`);
      });
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-2xl font-semibold text-gray-800">Customer Bills</h3>
          <div className="flex space-x-4">
            <Link
              to="/bills/add"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md text-sm font-medium"
            >
              + Add Bill
            </Link>
            <div className="flex space-x-4 text-base font-medium">
              <span className="text-green-600">Paid: {billStatusCounts.Paid || 0}</span>
              <span className="text-red-600">Unpaid: {billStatusCounts.Unpaid || 0}</span>
              <span className="text-yellow-600">Partial: {billStatusCounts.Partial || 0}</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Due Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Payment Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.length > 0 ? (
                bills.map((bill,i) => {
                  const dueAmount = bill.grandTotal - (bill.paidAmount || 0);
                  return (
                    <tr key={bill._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i+1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill._id.slice(-5)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(bill.billDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.items.length} item(s)</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{bill.grandTotal.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(bill.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(dueAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            bill.paymentStatus === 'Paid'
                              ? 'bg-green-100 text-green-800'
                              : bill.paymentStatus === 'Unpaid'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.paymentMode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => generateBillPDF(bill)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors duration-200 shadow-md"
                        >
                          Download Bill
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                    No bills added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Hidden printable bill */}
      <div style={{ position: 'absolute', insetInlineStart: '-9999px' }}>
        {bills.map(bill => (
          <div key={`pdf-${bill._id}`} id={`bill-pdf-${bill._id}`} style={{ padding: '20px', backgroundColor: 'white', width: '210mm' }}>
            <div style={{ textAlign: 'center', insetBlockEnd: '30px' }}>
              <h1>INVOICE</h1>
              <p>Bill ID: {bill._id}</p>
            </div>
            <div style={{ insetBlockEnd: '20px' }}>
              <p><strong>Customer:</strong> {bill.customerName}</p>
              <p><strong>Phone:</strong> {bill.customerPhone}</p>
              <p><strong>Date:</strong> {new Date(bill.billDate).toLocaleDateString()}</p>
              <p><strong>Payment Status:</strong> {bill.paymentStatus}</p>
              <p><strong>Payment Mode:</strong> {bill.paymentMode}</p>
            </div>
            <table style={{ inlineSize: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Item</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Quantity</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Rate</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map(item => (
                  <tr key={item.name}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>₹{item.rate.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2em', insetBlockStart: '20px' }}>
              Grand Total: ₹{bill.grandTotal.toFixed(2)}
            </div>
            {bill.notes && (
              <div style={{ insetBlockStart: '20px' }}>
                <p><strong>Notes:</strong> {bill.notes}</p>
              </div>
            )}
            <div style={{ insetBlockStart: '50px', textAlign: 'center', fontSize: '0.9em', color: '#666' }}>
              <p>Thank you for your business!</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillList;
