import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getKits, deleteKit } from '../../services/kitService';
import { Kit } from '../../types/models';
import { useUser } from '../../context/UserContext';
import { Plus, Edit, Trash2, Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Kits: React.FC = () => {
    const [kits, setKits] = useState<Kit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useUser();
    const navigate = useNavigate();

    const canCreate = user?.permissions.includes('kits:create');
    const canEdit = user?.permissions.includes('kits:edit');
    const canDelete = user?.permissions.includes('kits:delete');

    useEffect(() => {
        const fetchKits = async () => {
            if (!user?.shop) return;
            try {
                const data = await getKits(user.shop);
                setKits(data);
            } catch (err) {
                setError('Failed to fetch kits.');
            } finally {
                setLoading(false);
            }
        };
        fetchKits();
    }, [user?.shop]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this kit?')) {
            try {
                await deleteKit(id);
                setKits(kits.filter(k => k._id !== id));
                toast.success('Kit deleted successfully!');
            } catch (err) {
                toast.error('Failed to delete kit.');
                setError('Failed to delete kit.');
            }
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div><p className="mt-4 text-gray-500">Loading kits...</p></div></div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-500 text-lg">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div className="mb-6 md:mb-0">
                        <div className="flex items-center mb-2">
                            <Package className="text-blue-600 mr-3" size={32} />
                            <h1 className="text-3xl font-bold text-gray-800">Kits</h1>
                        </div>
                        <p className="text-gray-500">Manage your product bundles and kits</p>
                    </div>
                    <Link 
                        to="/kits/new" 
                        className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                        <Plus size={20} className="mr-2" />
                        Create New Kit
                    </Link>
                </div>

                {/* Content Section */}
                {kits.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">No kits yet</h2>
                        <p className="text-gray-500 mb-6">Create your first kit to get started with product bundles</p>
                        {canCreate && (
                            <Link 
                                to="/kits/new"
                                className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                <Plus size={18} className="mr-2" />
                                Create Kit
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full leading-normal">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Kit Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Components</th>
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {kits.map((kit) => (
                                            <tr key={kit._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                                                            <Package size={20} className="text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{kit.name}</p>
                                                            {kit.description && <p className="text-xs text-gray-500">{kit.description}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm">
                                                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-mono font-semibold">{kit.sku}</span>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-bold text-green-600">
                                                    ₹{kit.price.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-5 text-sm">
                                                    <div className="space-y-1 max-w-xs">
                                                        {kit.products.slice(0, 2).map((p) => (
                                                            <div key={p._id} className="flex items-center text-gray-700 text-xs">
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>
                                                                {p.product.name} <span className="text-gray-400 ml-1">×{p.quantity}</span>
                                                            </div>
                                                        ))}
                                                        {kit.products.length > 2 && (
                                                            <div className="text-gray-500 text-xs italic">
                                                                +{kit.products.length - 2} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-center">
                                                    <div className="flex justify-center items-center space-x-3">
                                                        {canEdit && (
                                                            <Link 
                                                                to={`/kits/edit/${kit._id}`}
                                                                className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Edit kit"
                                                            >
                                                                <Edit size={18} />
                                                            </Link>
                                                        )}
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => handleDelete(kit._id)}
                                                                className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete kit"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                                        <Package className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">Total Kits</p>
                                        <p className="text-2xl font-bold text-gray-800">{kits.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                                        <span className="text-green-600 text-xl font-bold">₹</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">Total Value</p>
                                        <p className="text-2xl font-bold text-gray-800">₹{kits.reduce((sum, kit) => sum + kit.price, 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mr-4">
                                        <span className="text-purple-600 text-xl font-bold">∑</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">Total Components</p>
                                        <p className="text-2xl font-bold text-gray-800">{kits.reduce((sum, kit) => sum + kit.products.length, 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Kits;
