import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { getKitById, createKit, updateKit } from '../../services/kitService';
import { getProducts } from '../../services/productService';
import { Kit, Product } from '../../types/models';
import { useUser } from '../../context/UserContext';
import { X, Plus } from 'lucide-react';

type FormValues = {
    name: string;
    description: string;
    products: { product: string; quantity: number }[];
};

const KitForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();

    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            name: '',
            description: '',
            products: []
        }
    });
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'products'
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.shop) return;
            try {
                const productsData = await getProducts(user.shop);
                setAvailableProducts(productsData);

                if (id) {
                    const kitData = await getKitById(id);
                    setValue('name', kitData.name);
                    setValue('description', kitData.description);
                    setValue('products', kitData.products.map(p => ({ product: (typeof p.product === 'string' ? p.product : p.product._id) || '', quantity: p.quantity })));
                }
            } catch (err) {
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user?.shop, setValue]);

    const onSubmit = async (data: FormValues) => {
        if (!user?.shop) {
            setError('Shop information is missing.');
            return;
        }

        const payload = {
            ...data,
            shop: user.shop,
            createdBy: user._id,
            products: data.products.map(p => ({...p, quantity: Number(p.quantity)}))
        };

        try {
            if (id) {
                await updateKit(id, payload);
            } else {
                await createKit(payload);
            }
            navigate('/kits');
        } catch (err) {
            setError('Failed to save kit.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{id ? 'Edit Kit' : 'Create Kit'}</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700">Name</label>
                    <input {...register('name', { required: 'Name is required' })} className="w-full px-3 py-2 border rounded-md" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700">Description</label>
                    <textarea {...register('description')} className="w-full px-3 py-2 border rounded-md" />
                </div>

                <h3 className="text-xl font-semibold mb-2">Products in Kit</h3>
                {fields.map((field: any, index: number) => (
                    <div key={field.id} className="flex items-center gap-4 mb-2 p-2 border rounded-md">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-600">Product</label>
                            <select {...register(`products.${index}.product`, { required: true })} className="w-full px-3 py-2 border rounded-md">
                                <option value="">Select a product</option>
                                {availableProducts.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-1/4">
                            <label className="block text-xs text-gray-600">Quantity</label>
                            <input type="number" {...register(`products.${index}.quantity`, { required: true, valueAsNumber: true, min: 1 })} className="w-full px-3 py-2 border rounded-md" defaultValue={1} />
                        </div>
                        <button type="button" onClick={() => remove(index)} className="text-red-500 mt-5">
                            <X size={20} />
                        </button>
                    </div>
                ))}

                <button type="button" onClick={() => append({ product: '', quantity: 1 })} className="mt-2 text-blue-500 flex items-center">
                    <Plus size={16} className="mr-1" /> Add Product
                </button>
                
                {errors.products && <p className="text-red-500 text-xs mt-2">Please add at least one product and fill out all fields.</p>}

                <div className="mt-6">
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">Save Kit</button>
                    <button type="button" onClick={() => navigate('/kits')} className="ml-2 text-gray-600">Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default KitForm;
