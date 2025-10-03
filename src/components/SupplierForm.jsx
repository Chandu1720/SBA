// SupplierForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const SupplierForm = ({ suppliers, setSuppliers }) => {
  const { id } = useParams(); // Get supplier ID from URL for edit mode
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstId: '',
    notes: ''
  });

  // Load supplier data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const supplier = suppliers.find(s => s._id === id);
      if (supplier) {
        setSupplierForm(supplier);
      } else {
        // Fetch from API if not found in local state (optional enhancement)
        axios.get(`${process.env.REACT_APP_API_URL}/api/suppliers/${id}`)
          .then(response => {
            setSupplierForm(response.data);
          })
          .catch(error => {
            console.error('Error fetching supplier for edit', error);
            navigate('/suppliers');
          });
      }
    }
  }, [id, isEditMode, suppliers, navigate]);

  const handleSupplierChange = (e) => {
    setSupplierForm({
      ...supplierForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditMode) {
      // Update existing supplier
      axios.put(`${process.env.REACT_APP_API_URL}/api/suppliers/${id}`, supplierForm)
        .then(response => {
          setSuppliers(suppliers.map(sup => (sup._id === id ? response.data : sup)));
          navigate('/suppliers');
        })
        .catch(error => {
          console.error('There was an error updating the supplier!', error);
        });
    } else {
      // Add new supplier
      axios.post(`${process.env.REACT_APP_API_URL}/api/suppliers`, supplierForm)
        .then(response => {
          setSuppliers([...suppliers, response.data]);
          navigate('/suppliers');
        })
        .catch(error => {
          console.error('There was an error adding the supplier!', error);
        });
    }
  };

  const pageTitle = isEditMode ? 'Edit Supplier' : 'Add New Supplier';

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">{pageTitle}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={supplierForm.name}
                onChange={handleSupplierChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={supplierForm.contactPerson}
                onChange={handleSupplierChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={supplierForm.phone}
                onChange={handleSupplierChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={supplierForm.email}
                onChange={handleSupplierChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={supplierForm.address}
                onChange={handleSupplierChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST/Tax ID
              </label>
              <input
                type="text"
                name="gstId"
                value={supplierForm.gstId}
                onChange={handleSupplierChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={supplierForm.notes}
                onChange={handleSupplierChange}
                rows="3"
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
              {isEditMode ? 'Update Supplier' : 'Add Supplier'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
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

export default SupplierForm;