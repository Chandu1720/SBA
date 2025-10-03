// SupplierList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SupplierList = ({ suppliers, setSuppliers }) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`/api/suppliers`)
      .then(response => {
        setSuppliers(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('There was an error fetching the suppliers!', error);
        setLoading(false);
      });
  }, [setSuppliers]);

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;

    axios.delete(`/api/suppliers/${id}`)
      .then(() => {
        setSuppliers(suppliers.filter(sup => sup._id !== id));
      })
      .catch(error => {
        console.error('There was an error deleting the supplier!', error);
      });
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-2xl font-semibold text-gray-800">Supplier List</h3>
          <Link
            to="/suppliers/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md"
          >
            + Add Supplier
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">GST ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.length > 0 ? (
                suppliers.map((supplier,i) => (
                  <tr key={supplier._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i+1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4)+1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.name.toUpperCase()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.contactPerson}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.gstId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/suppliers/edit/${supplier._id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(supplier._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No suppliers added yet
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

export default SupplierList;