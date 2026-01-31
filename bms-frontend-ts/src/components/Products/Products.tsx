import React, { useEffect, useState } from 'react';
import { Product } from '../../types/models';
import { getAllProducts, deleteProduct } from '../../services/productService';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.shop) {
      fetchProducts(user.shop);
    }
  }, [user?.shop]);

  const fetchProducts = async (shopId: string) => {
    try {
      setLoading(true);
      const data = await getAllProducts(shopId);
      setProducts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        if (user?.shop) {
          fetchProducts(user.shop); // Refresh the list
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete product.');
      }
    }
  };

  if (loading) return <div className="text-center py-4">Loading products...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="flex justify-end mb-4">
        <Link to="/products/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-500">No products found. Add one now!</p>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity
                  </th>
                   <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Catogery
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Product Type
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Stock Alert
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.name}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.sku}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      ₹{product.price.toFixed(2)}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.quantity}{product.unitType}
                    </td>
                    {/* <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.unitType}
                    </td> */}
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.category || '-'}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.productType || '-'}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.brand || '-'}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      ₹{product.costPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {product.quantity <= (product.minStockLevel || 0) ? (
                        <span className="text-red-600 font-semibold">Low Stock</span>
                      ) : (
                        <span className="text-green-600">In Stock</span>
                      )}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.status || 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                      <button
                        onClick={() => navigate(`/products/${product._id}/edit`)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product._id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {products.map((product) => (
              <div key={product._id} className="bg-white p-4 rounded-lg shadow-md border">
                <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>SKU: {product.sku}</p>
                  <p>Price: ₹{product.price.toFixed(2)}</p>
                  <p>Cost: ₹{product.costPrice?.toFixed(2) || '0.00'}</p>
                  <p>Quantity: {product.quantity} {product.unitType}</p>
                  {product.category && <p>Category: {product.category}</p>}
                  {product.productType && <p>Type: {product.productType}</p>}
                  {product.brand && <p>Brand: {product.brand}</p>}
                  <p>Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    product.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status || 'active'}
                  </span></p>
                  {product.quantity <= (product.minStockLevel || 0) && (
                    <p className="text-red-600 font-semibold">⚠️ Low Stock Alert</p>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    onClick={() => navigate(`/products/${product._id}/edit`)}
                    className="text-indigo-600 hover:text-indigo-900 px-3 py-1 border rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id!)}
                    className="text-red-600 hover:text-red-900 px-3 py-1 border rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Products;
