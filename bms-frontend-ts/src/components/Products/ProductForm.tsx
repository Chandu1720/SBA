import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, Supplier } from '../../types/models';
import { getProductById, createProduct, updateProduct } from '../../services/productService';
import { getSuppliers } from '../../services/supplierService';
import { useUser } from '../../context/UserContext';

// 🔧 Define auto-specific options
const AUTO_CATEGORIES = [
  'Engine & Drivetrain',
  'Brakes & Suspension',
  'Electrical & Lighting',
  'Tires & Wheels',
  'Filters & Fluids',
  'Exterior & Body',
  'Interior & Comfort',
  'Tools & Garage',
];

const PRODUCT_TYPES = [
  'Battery',
  'Oil Filter',
  'Air Filter',
  'Fuel Filter',
  'Headlight',
  'Taillight',
  'Brake Pad',
  'Brake Rotor',
  'Tire',
  'Wheel',
  'Spark Plug',
  'Alternator',
  'Starter Motor',
  'Wiper Blade',
  'Cabin Air Filter',
];

// 🔸 Extend form data type
type ProductFormData = Omit<Product, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'sku'> & {
  shop: string;
  productType: string; // 👈 new field
};

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    productType: '', // 👈 initialize
    brand: '',
    barcode: '',
    price: 0,
    costPrice: 0,
    quantity: 0,
    minStockLevel: 0,
    unitType: '',
    taxRate: 0,
    taxType: 'GST',
    supplier: '',
    image: '',
    status: 'active',
    shop: user?.shop || '',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Fetch suppliers
    const fetchSuppliers = async () => {
      try {
        const data = await getSuppliers();
        setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
      } catch (err: any) {
        console.error('Failed to fetch suppliers:', err);
        setSuppliers([]);
      }
    };

    // Fetch product if editing
    const fetchProduct = async () => {
      if (id) {
        try {
          setLoading(true);
          const product = await getProductById(id);
          setFormData({
            name: product.name,
            description: product.description || '',
            category: product.category || '',
            productType: product.productType || '', // 👈 include if stored
            brand: product.brand || '',
            barcode: product.barcode || '',
            price: product.price,
            costPrice: product.costPrice || 0,
            quantity: product.quantity,
            minStockLevel: product.minStockLevel || 0,
            unitType: product.unitType,
            taxRate: product.taxRate || 0,
            taxType: product.taxType || 'GST',
            supplier: product.supplier || '',
            image: product.image || '',
            status: product.status || 'active',
            shop: product.shop,
          });
          if (product.image) {
            setImagePreview(product.image);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to fetch product.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchSuppliers();
    fetchProduct();
  }, [id, user?.shop]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a FileReader to preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData((prev) => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (id) {
        await updateProduct(id, formData);
      } else {
        if (!user?.shop) {
          setError('Shop ID is missing. Cannot create product.');
          return;
        }
        await createProduct({ ...formData, shop: user.shop });
      }
      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product.');
    }
  };

  if (loading) return <div className="text-center py-4">Loading form...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{id ? 'Edit Product' : 'Add New Product'}</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-4">
        {/* Product Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Product Name:
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        {/* Category Dropdown */}
        <div className="mb-4">
          <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2">
            Category:
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">-- Select Category --</option>
            {AUTO_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Product Type Dropdown (Critical for Auto Shop) */}
        <div className="mb-4">
          <label htmlFor="productType" className="block text-gray-700 text-sm font-bold mb-2">
            Product Type:
          </label>
          <select
            id="productType"
            name="productType"
            value={formData.productType}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">-- Select Product Type --</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Used for SKU generation and inventory logic (e.g., Battery → SKU prefix "BA")
          </p>
        </div>

        {/* Brand */}
        <div className="mb-4">
          <label htmlFor="brand" className="block text-gray-700 text-sm font-bold mb-2">
            Brand:
          </label>
          <input
            type="text"
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g., Bosch, Michelin, ACDelco"
            required
          />
        </div>

        {/* Rest of your fields remain unchanged... */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            rows={3}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
            Price:
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-2">
            Quantity:
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            min="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="unitType" className="block text-gray-700 text-sm font-bold mb-2">
            Unit Type:
          </label>
          <input
            type="text"
            id="unitType"
            name="unitType"
            value={formData.unitType}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g., pc, set, pair"
            required
          />
        </div>

        {/* Other fields (barcode, costPrice, etc.) — keep as-is */}

        <div className="mb-4">
          <label htmlFor="barcode" className="block text-gray-700 text-sm font-bold mb-2">
            Barcode:
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter barcode number"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="costPrice" className="block text-gray-700 text-sm font-bold mb-2">
            Cost Price:
          </label>
          <input
            type="number"
            id="costPrice"
            name="costPrice"
            value={formData.costPrice}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            min="0"
            step="0.01"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="minStockLevel" className="block text-gray-700 text-sm font-bold mb-2">
            Minimum Stock Level:
          </label>
          <input
            type="number"
            id="minStockLevel"
            name="minStockLevel"
            value={formData.minStockLevel}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            min="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="taxType" className="block text-gray-700 text-sm font-bold mb-2">
            Tax Type:
          </label>
          <select
            id="taxType"
            name="taxType"
            value={formData.taxType}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="GST">GST</option>
            <option value="VAT">VAT</option>
            <option value="None">None</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="taxRate" className="block text-gray-700 text-sm font-bold mb-2">
            Tax Rate (%):
          </label>
          <input
            type="number"
            id="taxRate"
            name="taxRate"
            value={formData.taxRate}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="supplier" className="block text-gray-700 text-sm font-bold mb-2">
            Supplier:
          </label>
          <select
            id="supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id || ''}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">
            Product Image:
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            capture="environment"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload a photo or take a photo using your device camera
          </p>
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm text-gray-700 mb-2">Preview:</p>
              <img
                src={imagePreview}
                alt="Product preview"
                className="max-w-xs max-h-64 border rounded"
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
            Status:
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {id ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;