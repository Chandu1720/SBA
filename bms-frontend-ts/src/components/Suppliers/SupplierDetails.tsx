import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSupplierById } from '../../services/supplierService';
import { Supplier } from '../../types/models';

const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getSupplierById(id);
        setSupplier(data);
      } catch (err) {
        setError('Failed to fetch supplier details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading supplier details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
        <p className="text-red-600 text-xl font-medium mb-4">{error}</p>
        <Link to="/suppliers" className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
          Back to Suppliers
        </Link>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center p-10">
        <p className="text-xl text-gray-700">Supplier not found.</p>
        <Link to="/suppliers" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800">{supplier.name}</h1>
          <Link to="/suppliers" className="text-blue-600 hover:text-blue-800 transition-colors">
            &larr; Back to Suppliers
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <p><strong>Contact Person:</strong> {supplier.contactPerson}</p>
              <p><strong>Email:</strong> <a href={`mailto:${supplier.email}`} className="text-blue-500 hover:underline">{supplier.email}</a></p>
              <p><strong>Phone:</strong> <a href={`tel:${supplier.phone}`} className="text-blue-500 hover:underline">{supplier.phone}</a></p>
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Address & GST</h2>
            <div className="space-y-3">
              <p><strong>Address:</strong> {supplier.address}</p>
              <p><strong>GST ID:</strong> {supplier.gstId}</p>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Notes</h2>
            <p className="text-gray-700">{supplier.notes}</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to={`/suppliers/${supplier._id}/edit`} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-transform duration-200 transform hover:scale-105">
            Edit Supplier
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetails;
