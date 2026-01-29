import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Bill, Product, Kit } from "../../types/models";
import { createBill, updateBill, getBillById } from "../../services/billService";
import { getProducts } from "../../services/productService";
import { getKits } from "../../services/kitService";
import { useUser } from "../../context/UserContext";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { PlusCircle, Trash2, ArrowLeft, Save, Loader2, X, CalendarDays, User2, Phone, IndianRupee, FileText, CreditCard } from "lucide-react";
import Modal from 'react-modal';

type LineItem = {
    itemType: 'Simple' | 'Product' | 'Kit';
    itemId?: string;
    name: string;
    quantity: number;
    rate: number;
    total: number;
    itemModel?: 'Product' | 'Kit';
};

type FormValues = {
    customerName: string;
    customerPhone: string;
    billDate: string;
    items: LineItem[];
    grandTotal: number;
    paymentStatus: 'Pending' | 'Paid' | 'Partial';
    paidAmount: number;
    paymentMode: string;
    notes: string;
    shop: string;
    applyDiscount: boolean;
    discountAmount: number;
    discountType: 'fixed' | 'percentage';
    applyGST: boolean;
    gstRate: number;
};

Modal.setAppElement('#root');

const BillsFormV2: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectableItems, setSelectableItems] = useState<(Product | Kit)[]>([]);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            customerName: "",
            customerPhone: "",
            billDate: new Date().toISOString().substring(0, 10),
            items: [],
            grandTotal: 0,
            paymentStatus: "Pending",
            paidAmount: 0,
            paymentMode: "",
            notes: "",
            applyDiscount: false,
            discountAmount: 0,
            discountType: 'fixed',
            applyGST: false,
            gstRate: 18,
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "items"
    });

    const items = watch("items");
    const paymentStatus = watch("paymentStatus");
    const applyDiscount = watch("applyDiscount");
    const discountAmount = watch("discountAmount");
    const discountType = watch("discountType");
    const applyGST = watch("applyGST");
    const gstRate = watch("gstRate");

    const subtotal = items.reduce((sum: number, item: LineItem) => sum + (item.total || 0), 0);
    
    let discountValue = 0;
    if (applyDiscount) {
        discountValue = discountType === 'percentage' ? (subtotal * discountAmount) / 100 : discountAmount;
    }
    
    const amountAfterDiscount = subtotal - discountValue;
    const gstAmount = applyGST ? (amountAfterDiscount * gstRate) / 100 : 0;
    const grandTotal = amountAfterDiscount + gstAmount;

    useEffect(() => {
        setValue("grandTotal", grandTotal);
        if (paymentStatus === "Paid") {
            setValue("paidAmount", grandTotal);
        }
    }, [grandTotal, paymentStatus, setValue]);


    const fetchBillData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const bill = await getBillById(id);
            setValue('customerName', bill.customerName);
            setValue('customerPhone', bill.customerPhone);
            setValue('billDate', new Date(bill.billDate).toISOString().substring(0, 10));
            setValue('items', bill.items);
            setValue('paymentStatus', bill.paymentStatus as any);
            setValue('paidAmount', bill.paidAmount);
            setValue('paymentMode', bill.paymentMode);
            setValue('notes', bill.notes);
        } catch {
            toast.error("Failed to load bill data.");
        } finally {
            setLoading(false);
        }
    }, [id, setValue]);

    useEffect(() => {
        if (isEdit) {
            fetchBillData();
        }
    }, [isEdit, fetchBillData]);

    const fetchSelectableItems = useCallback(async () => {
        if (!user?.shop) return;
        try {
            const productsData = await getProducts(user.shop);
            const kitsData = await getKits(user.shop);
            setSelectableItems([...productsData, ...kitsData]);
        } catch {
            toast.error("Failed to load products and kits.");
        }
    }, [user?.shop]);

    useEffect(() => {
        fetchSelectableItems();
    }, [fetchSelectableItems]);

    const handleSelectItem = (item: Product | Kit) => {
        const itemType = 'products' in item ? 'Kit' : 'Product';
        
        // If it's a kit, add all products in the kit
        if (itemType === 'Kit') {
            const kit = item as Kit;
            kit.products.forEach((kitItem) => {
                append({
                    itemType: 'Product',
                    itemId: kitItem.product._id,
                    name: kitItem.product.name,
                    quantity: kitItem.quantity,
                    rate: kitItem.product.price,
                    total: kitItem.quantity * kitItem.product.price,
                    itemModel: 'Product'
                });
            });
        } else {
            // If it's a product, add normally
            append({
                itemType: 'Product',
                itemId: item._id,
                name: item.name,
                quantity: 1,
                rate: item.price,
                total: item.price,
                itemModel: 'Product'
            });
        }
        setIsModalOpen(false);
        setSearchQuery("");
    };

    const handleItemChange = (index: number, field: 'quantity' | 'rate', value: number) => {
        const currentItem = items[index];
        const newQuantity = field === 'quantity' ? value : currentItem.quantity;
        const newRate = field === 'rate' ? value : currentItem.rate;
        const newTotal = newQuantity * newRate;
        update(index, { ...currentItem, [field]: value, total: newTotal });
    };
    
    const submit = async (data: FormValues) => {
        if (!user?.shop) {
            toast.error("Shop information is not available.");
            return;
        }

        const billData = { ...data, shop: user.shop };

        setLoading(true);
        try {
            if (isEdit && id) {
                await updateBill(id, billData);
                toast.success("Bill updated successfully!");
            } else {
                await createBill(billData);
                toast.success("Bill created successfully!");
            }
            navigate("/bills");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save the bill.");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectableItems.filter(item => 
        !('products' in item) && item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) as Product[];

    const filteredKits = selectableItems.filter(item => 
        'products' in item && item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) as Kit[];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                    <h2 className="text-4xl font-bold">{isEdit ? "Edit Bill" : "Create Bill"}</h2>
                    <p className="text-blue-100 mt-2">Manage your sales bills efficiently</p>
                </div>

                <form onSubmit={handleSubmit(submit)} className="p-8 space-y-8">
                    {/* Customer Information Section */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <User2 size={20} className="text-blue-600" />
                            Customer Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                    <User2 size={14} className="text-gray-600" />
                                    Customer Name
                                </label>
                                <input 
                                    {...register("customerName", { required: "Customer name is required" })} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    placeholder="Enter customer name"
                                />
                                {errors.customerName && <span className="text-red-500 text-xs mt-1">{errors.customerName.message}</span>}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                    <Phone size={14} className="text-gray-600" />
                                    Phone Number
                                </label>
                                <input 
                                    {...register("customerPhone")} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                    <CalendarDays size={14} className="text-gray-600" />
                                    Bill Date
                                </label>
                                <input 
                                    type="date" 
                                    {...register("billDate")} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" />
                                Bill Items
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(true)} 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition transform hover:scale-105"
                            >
                                <PlusCircle size={18} />
                                Add Item
                            </button>
                        </div>

                        {fields.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                <p className="text-lg mb-2">No items added yet</p>
                                <p className="text-sm">Click "Add Item" to start adding products to your bill</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                {/* Desktop view */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Quantity</th>
                                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Rate (₹)</th>
                                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total (₹)</th>
                                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fields.map((field: any, index: number) => (
                                                <tr key={field.id} className="border-b border-gray-200 hover:bg-blue-50 transition">
                                                    <td className="px-6 py-4 text-sm text-gray-800">
                                                        <input 
                                                            {...register(`items.${index}.name`)} 
                                                            readOnly 
                                                            className="w-full p-2 border rounded bg-gray-100 text-gray-700 font-medium"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <input 
                                                            type="number" 
                                                            {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })} 
                                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} 
                                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <input 
                                                            type="number" 
                                                            {...register(`items.${index}.rate`, { valueAsNumber: true, min: 0 })} 
                                                            onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} 
                                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
                                                        ₹{items[index]?.total.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => remove(index)} 
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile view */}
                                <div className="md:hidden space-y-3 p-4">
                                    {fields.map((field: any, index: number) => (
                                        <div key={field.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <input 
                                                    {...register(`items.${index}.name`)} 
                                                    readOnly 
                                                    className="flex-1 p-2 border rounded bg-gray-100 text-gray-700 font-medium text-sm"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => remove(index)} 
                                                    className="text-red-500 ml-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                <div>
                                                    <label className="text-xs text-gray-600 block mb-1">Qty</label>
                                                    <input 
                                                        type="number" 
                                                        {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })} 
                                                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} 
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600 block mb-1">Rate</label>
                                                    <input 
                                                        type="number" 
                                                        {...register(`items.${index}.rate`, { valueAsNumber: true, min: 0 })} 
                                                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} 
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600 block mb-1">Total</label>
                                                    <div className="px-2 py-1 bg-gray-100 rounded text-sm font-semibold">₹{items[index]?.total.toFixed(2) || '0.00'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total Section with Discount & GST */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                        {/* Discount Section */}
                        <div className="mb-6 pb-6 border-b border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <input 
                                    type="checkbox"
                                    {...register("applyDiscount")}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                                <label className="text-sm font-semibold text-gray-700 cursor-pointer">Apply Discount</label>
                            </div>
                            
                            {applyDiscount && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-2">Discount Type</label>
                                        <select 
                                            {...register("discountType")}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="fixed">Fixed Amount (₹)</option>
                                            <option value="percentage">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-2">
                                            {discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                                        </label>
                                        <input 
                                            type="number"
                                            {...register("discountAmount", { valueAsNumber: true, min: 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Enter amount"
                                        />
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <div className="text-sm">
                                            <span className="text-gray-600">Discount: </span>
                                            <span className="font-semibold text-red-600">-₹{discountValue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* GST Section */}
                        <div className="mb-6 pb-6 border-b border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <input 
                                    type="checkbox"
                                    {...register("applyGST")}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                                <label className="text-sm font-semibold text-gray-700 cursor-pointer">Apply GST</label>
                            </div>
                            
                            {applyGST && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-2">GST Rate (%)</label>
                                        <select 
                                            {...register("gstRate", { valueAsNumber: true })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value={0}>0% - No GST</option>
                                            <option value={5}>5% - GST</option>
                                            <option value={12}>12% - GST</option>
                                            <option value={18}>18% - GST</option>
                                            <option value={28}>28% - GST</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <div className="text-sm">
                                            <span className="text-gray-600">GST Amount: </span>
                                            <span className="font-semibold text-green-600">+₹{gstAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Total Calculation */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Subtotal</span>
                                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                            </div>
                            {applyDiscount && discountValue > 0 && (
                                <div className="flex justify-between items-center text-red-600">
                                    <span>Discount</span>
                                    <span className="font-medium">-₹{discountValue.toFixed(2)}</span>
                                </div>
                            )}
                            {applyGST && gstAmount > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span>GST ({gstRate}%)</span>
                                    <span className="font-medium">+₹{gstAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
                                <span className="text-lg font-bold text-gray-800">Grand Total</span>
                                <span className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-blue-600" />
                            Payment Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">Payment Status</label>
                                <select 
                                    {...register("paymentStatus")} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                            
                            {(paymentStatus === "Paid" || paymentStatus === "Partial") && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-2">Paid Amount</label>
                                    <input 
                                        type="number" 
                                        {...register("paidAmount", { valueAsNumber: true })} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="Enter paid amount"
                                        step="0.01"
                                    />
                                </div>
                            )}

                            {(paymentStatus === "Paid" || paymentStatus === "Partial") && (
                                <div className="md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700 block mb-2">Payment Mode</label>
                                    <select 
                                        {...register("paymentMode")} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    >
                                        <option value="">Select Payment Mode</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <FileText size={14} className="text-gray-600" />
                            Additional Notes
                        </label>
                        <textarea 
                            {...register("notes")} 
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            rows={4}
                            placeholder="Add any special notes or terms..."
                        ></textarea>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={() => navigate("/bills")} 
                            className="px-8 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition transform hover:scale-105"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Bill
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Enhanced Modal for selecting items */}
            <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} style={{ overlay: { zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.7)' }, content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '700px', padding: '0', borderRadius: '12px', border: 'none' } }}>
                <div className="bg-white rounded-lg">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
                        <h3 className="text-2xl font-bold">Select Items</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition">
                            <X size={24}/>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-6 border-b border-gray-200">
                        <input 
                            type="text" 
                            placeholder="Search for products or kits..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Items List */}
                    <div className="max-h-96 overflow-y-auto p-6 space-y-6">
                        {/* Products Section */}
                        {filteredProducts.length > 0 && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                    Individual Products
                                </h4>
                                <div className="space-y-2">
                                    {filteredProducts.map(item => (
                                        <div 
                                            key={item._id} 
                                            onClick={() => handleSelectItem(item)} 
                                            className="p-4 hover:bg-blue-50 cursor-pointer border border-gray-200 rounded-lg transition transform hover:shadow-md hover:scale-102"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-blue-600">₹{(item as Product).price.toFixed(2)}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Stock: {(item as Product).quantity} {(item as Product).unitType}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Kits Section */}
                        {filteredKits.length > 0 && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                    Kits
                                </h4>
                                <div className="space-y-2">
                                    {filteredKits.map(item => (
                                        <div 
                                            key={item._id} 
                                            onClick={() => handleSelectItem(item)} 
                                            className="p-4 hover:bg-purple-50 cursor-pointer border border-gray-200 rounded-lg transition transform hover:shadow-md hover:scale-102 bg-gradient-to-br from-purple-50 to-white"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                                                        <span className="text-purple-600 text-sm font-bold">KIT</span>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-2">
                                                        Contains: {(item as Kit).products.map(p => p.product.name).join(', ')}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Items in kit: {(item as Kit).products.length}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-purple-600">₹{item.price.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {filteredProducts.length === 0 && filteredKits.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No items found</p>
                                <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BillsFormV2;