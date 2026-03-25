// import React, { useState, useEffect, useCallback } from "react";
// import { useForm, useFieldArray } from "react-hook-form";
// import { Product, Kit } from "../../types/models";
// import { createBill, updateBill, getBillById } from "../../services/billService";
// import { getProducts } from "../../services/productService";
// import { getKits } from "../../services/kitService";
// import { useUser } from "../../context/UserContext";
// import toast from "react-hot-toast";
// import { useNavigate, useParams } from "react-router-dom";
// import { PlusCircle, Trash2, Save, Loader2, X, CalendarDays, User2, Phone, FileText, CreditCard } from "lucide-react";
// import Modal from 'react-modal';

// type LineItem = {
//     itemType: 'Simple' | 'Product' | 'Kit';
//     itemId?: string;
//     name: string;
//     quantity: number;
//     rate: number;
//     total: number;
//     itemModel?: 'Product' | 'Kit';
// };

// type FormValues = {
//     customerName: string;
//     customerPhone: string;
//     billDate: string;
//     items: LineItem[];
//     grandTotal: number;
//     paymentStatus: 'Pending' | 'Paid' | 'Partial';
//     paidAmount: number;
//     paymentMode: string;
//     notes: string;
//     shop: string;
//     applyDiscount: boolean;
//     discountAmount: number;
//     discountType: 'fixed' | 'percentage';
//     applyGST: boolean;
//     gstRate: number;
// };

// Modal.setAppElement('#root');

// const BillsFormV2: React.FC = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const { user } = useUser();
//     const isEdit = Boolean(id);

//     const [loading, setLoading] = useState(false);
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [selectableItems, setSelectableItems] = useState<(Product | Kit)[]>([]);

//     const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
//         defaultValues: {
//             customerName: "",
//             customerPhone: "",
//             billDate: new Date().toISOString().substring(0, 10),
//             items: [],
//             grandTotal: 0,
//             paymentStatus: "Pending",
//             paidAmount: 0,
//             paymentMode: "",
//             notes: "",
//             applyDiscount: false,
//             discountAmount: 0,
//             discountType: 'fixed',
//             applyGST: false,
//             gstRate: 18,
//         }
//     });

//     const { fields, append, remove, update } = useFieldArray({
//         control,
//         name: "items"
//     });

//     const items = watch("items");
//     const paymentStatus = watch("paymentStatus");
//     const applyDiscount = watch("applyDiscount");
//     const discountAmount = watch("discountAmount");
//     const discountType = watch("discountType");
//     const applyGST = watch("applyGST");
//     const gstRate = watch("gstRate");

//     const subtotal = items.reduce((sum: number, item: LineItem) => sum + (item.total || 0), 0);
    
//     let discountValue = 0;
//     if (applyDiscount) {
//         discountValue = discountType === 'percentage' ? (subtotal * discountAmount) / 100 : discountAmount;
//     }
    
//     const amountAfterDiscount = subtotal - discountValue;
//     const gstAmount = applyGST ? (amountAfterDiscount * gstRate) / 100 : 0;
//     const grandTotal = amountAfterDiscount + gstAmount;

//     useEffect(() => {
//         setValue("grandTotal", grandTotal);
//         if (paymentStatus === "Paid") {
//             setValue("paidAmount", grandTotal);
//         }
//     }, [grandTotal, paymentStatus, setValue]);


//     const fetchBillData = useCallback(async () => {
//         if (!id) return;
//         setLoading(true);
//         try {
//             const bill = await getBillById(id);
//             setValue('customerName', bill.customerName);
//             setValue('customerPhone', bill.customerPhone);
//             setValue('billDate', new Date(bill.billDate).toISOString().substring(0, 10));
//             setValue('items', bill.items);
//             setValue('paymentStatus', bill.paymentStatus as any);
//             setValue('paidAmount', bill.paidAmount);
//             setValue('paymentMode', bill.paymentMode);
//             setValue('notes', bill.notes);
//         } catch {
//             toast.error("Failed to load bill data.");
//         } finally {
//             setLoading(false);
//         }
//     }, [id, setValue]);

//     useEffect(() => {
//         if (isEdit) {
//             fetchBillData();
//         }
//     }, [isEdit, fetchBillData]);

//     const fetchSelectableItems = useCallback(async () => {
//         if (!user?.shop) return;
//         try {
//             const productsData = await getProducts(user.shop);
//             const kitsData = await getKits(user.shop);
//             setSelectableItems([...productsData, ...kitsData]);
//         } catch {
//             toast.error("Failed to load products and kits.");
//         }
//     }, [user?.shop]);

//     useEffect(() => {
//         fetchSelectableItems();
//     }, [fetchSelectableItems]);

//     const handleSelectItem = (item: Product | Kit) => {
//         const itemType = 'products' in item ? 'Kit' : 'Product';
        
//         // If it's a kit, add all products in the kit
//         if (itemType === 'Kit') {
//             const kit = item as Kit;
//             kit.products.forEach((kitItem) => {
//                 append({
//                     itemType: 'Product',
//                     itemId: kitItem.product._id,
//                     name: kitItem.product.name,
//                     quantity: kitItem.quantity,
//                     rate: kitItem.product.price,
//                     total: kitItem.quantity * kitItem.product.price,
//                     itemModel: 'Product'
//                 });
//             });
//         } else {
//             // If it's a product, add normally
//             append({
//                 itemType: 'Product',
//                 itemId: item._id,
//                 name: item.name,
//                 quantity: 1,
//                 rate: item.price,
//                 total: item.price,
//                 itemModel: 'Product'
//             });
//         }
//         setIsModalOpen(false);
//         setSearchQuery("");
//     };

//     const handleItemChange = (index: number, field: 'quantity' | 'rate', value: number) => {
//         const currentItem = items[index];
//         const newQuantity = field === 'quantity' ? value : currentItem.quantity;
//         const newRate = field === 'rate' ? value : currentItem.rate;
//         const newTotal = newQuantity * newRate;
//         update(index, { ...currentItem, [field]: value, total: newTotal });
//     };
    
//     const submit = async (data: FormValues) => {
//         if (!user?.shop) {
//             toast.error("Shop information is not available.");
//             return;
//         }

//         const billData = { ...data, shop: user.shop };

//         setLoading(true);
//         try {
//             if (isEdit && id) {
//                 await updateBill(id, billData);
//                 toast.success("Bill updated successfully!");
//             } else {
//                 await createBill(billData);
//                 toast.success("Bill created successfully!");
//             }
//             navigate("/bills");
//         } catch (err: any) {
//             toast.error(err.response?.data?.message || "Failed to save the bill.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const filteredProducts = selectableItems.filter(item => 
//         !('products' in item) && item.name.toLowerCase().includes(searchQuery.toLowerCase())
//     ) as Product[];

//     const filteredKits = selectableItems.filter(item => 
//         'products' in item && item.name.toLowerCase().includes(searchQuery.toLowerCase())
//     ) as Kit[];

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
//             <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
//                 {/* Header */}
//                 <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
//                     <h2 className="text-4xl font-bold">{isEdit ? "Edit Bill" : "Create Bill"}</h2>
//                     <p className="text-blue-100 mt-2">Manage your sales bills efficiently</p>
//                 </div>

//                 <form onSubmit={handleSubmit(submit)} className="p-8 space-y-8">
//                     {/* Customer Information Section */}
//                     <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
//                         <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
//                             <User2 size={20} className="text-blue-600" />
//                             Customer Information
//                         </h3>
//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                             <div>
//                                 <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
//                                     <User2 size={14} className="text-gray-600" />
//                                     Customer Name
//                                 </label>
//                                 <input 
//                                     {...register("customerName", { required: "Customer name is required" })} 
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                     placeholder="Enter customer name"
//                                 />
//                                 {errors.customerName && <span className="text-red-500 text-xs mt-1">{errors.customerName.message}</span>}
//                             </div>
//                             <div>
//                                 <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
//                                     <Phone size={14} className="text-gray-600" />
//                                     Phone Number
//                                 </label>
//                                 <input 
//                                     {...register("customerPhone")} 
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                     placeholder="Enter phone number"
//                                 />
//                             </div>
//                             <div>
//                                 <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
//                                     <CalendarDays size={14} className="text-gray-600" />
//                                     Bill Date
//                                 </label>
//                                 <input 
//                                     type="date" 
//                                     {...register("billDate")} 
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Items Section */}
//                     <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
//                         <div className="flex justify-between items-center mb-4">
//                             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
//                                 <FileText size={20} className="text-blue-600" />
//                                 Bill Items
//                             </h3>
//                             <button 
//                                 type="button" 
//                                 onClick={() => setIsModalOpen(true)} 
//                                 className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition transform hover:scale-105"
//                             >
//                                 <PlusCircle size={18} />
//                                 Add Item
//                             </button>
//                         </div>

//                         {fields.length === 0 ? (
//                             <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
//                                 <p className="text-lg mb-2">No items added yet</p>
//                                 <p className="text-sm">Click "Add Item" to start adding products to your bill</p>
//                             </div>
//                         ) : (
//                             <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
//                                 {/* Desktop view */}
//                                 <div className="hidden md:block overflow-x-auto">
//                                     <table className="w-full">
//                                         <thead className="bg-gray-100 border-b border-gray-200">
//                                             <tr>
//                                                 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
//                                                 <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Quantity</th>
//                                                 <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Rate (₹)</th>
//                                                 <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total (₹)</th>
//                                                 <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {fields.map((field: any, index: number) => (
//                                                 <tr key={field.id} className="border-b border-gray-200 hover:bg-blue-50 transition">
//                                                     <td className="px-6 py-4 text-sm text-gray-800">
//                                                         <input 
//                                                             {...register(`items.${index}.name`)} 
//                                                             readOnly 
//                                                             className="w-full p-2 border rounded bg-gray-100 text-gray-700 font-medium"
//                                                         />
//                                                     </td>
//                                                     <td className="px-6 py-4 text-sm">
//                                                         <input 
//                                                             type="number" 
//                                                             {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })} 
//                                                             onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} 
//                                                             className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
//                                                         />
//                                                     </td>
//                                                     <td className="px-6 py-4 text-sm">
//                                                         <input 
//                                                             type="number" 
//                                                             {...register(`items.${index}.rate`, { valueAsNumber: true, min: 0 })} 
//                                                             onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} 
//                                                             className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
//                                                         />
//                                                     </td>
//                                                     <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
//                                                         ₹{items[index]?.total.toFixed(2) || '0.00'}
//                                                     </td>
//                                                     <td className="px-6 py-4 text-sm text-center">
//                                                         <button 
//                                                             type="button" 
//                                                             onClick={() => remove(index)} 
//                                                             className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
//                                                         >
//                                                             <Trash2 size={18} />
//                                                         </button>
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {/* Mobile view */}
//                                 <div className="md:hidden space-y-3 p-4">
//                                     {fields.map((field: any, index: number) => (
//                                         <div key={field.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                                             <div className="flex justify-between items-start mb-3">
//                                                 <input 
//                                                     {...register(`items.${index}.name`)} 
//                                                     readOnly 
//                                                     className="flex-1 p-2 border rounded bg-gray-100 text-gray-700 font-medium text-sm"
//                                                 />
//                                                 <button 
//                                                     type="button" 
//                                                     onClick={() => remove(index)} 
//                                                     className="text-red-500 ml-2"
//                                                 >
//                                                     <Trash2 size={16} />
//                                                 </button>
//                                             </div>
//                                             <div className="grid grid-cols-3 gap-2 mb-2">
//                                                 <div>
//                                                     <label className="text-xs text-gray-600 block mb-1">Qty</label>
//                                                     <input 
//                                                         type="number" 
//                                                         {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })} 
//                                                         onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} 
//                                                         className="w-full px-2 py-1 border rounded text-sm"
//                                                     />
//                                                 </div>
//                                                 <div>
//                                                     <label className="text-xs text-gray-600 block mb-1">Rate</label>
//                                                     <input 
//                                                         type="number" 
//                                                         {...register(`items.${index}.rate`, { valueAsNumber: true, min: 0 })} 
//                                                         onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} 
//                                                         className="w-full px-2 py-1 border rounded text-sm"
//                                                     />
//                                                 </div>
//                                                 <div>
//                                                     <label className="text-xs text-gray-600 block mb-1">Total</label>
//                                                     <div className="px-2 py-1 bg-gray-100 rounded text-sm font-semibold">₹{items[index]?.total.toFixed(2) || '0.00'}</div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     {/* Total Section with Discount & GST */}
//                     <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
//                         {/* Discount Section */}
//                         <div className="mb-6 pb-6 border-b border-blue-200">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <input 
//                                     type="checkbox"
//                                     {...register("applyDiscount")}
//                                     className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
//                                 />
//                                 <label className="text-sm font-semibold text-gray-700 cursor-pointer">Apply Discount</label>
//                             </div>
                            
//                             {applyDiscount && (
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
//                                     <div>
//                                         <label className="text-xs font-medium text-gray-600 block mb-2">Discount Type</label>
//                                         <select 
//                                             {...register("discountType")}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                                         >
//                                             <option value="fixed">Fixed Amount (₹)</option>
//                                             <option value="percentage">Percentage (%)</option>
//                                         </select>
//                                     </div>
//                                     <div>
//                                         <label className="text-xs font-medium text-gray-600 block mb-2">
//                                             {discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
//                                         </label>
//                                         <input 
//                                             type="number"
//                                             {...register("discountAmount", { valueAsNumber: true, min: 0 })}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                                             placeholder="Enter amount"
//                                         />
//                                     </div>
//                                     <div className="flex items-end pb-2">
//                                         <div className="text-sm">
//                                             <span className="text-gray-600">Discount: </span>
//                                             <span className="font-semibold text-red-600">-₹{discountValue.toFixed(2)}</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* GST Section */}
//                         <div className="mb-6 pb-6 border-b border-blue-200">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <input 
//                                     type="checkbox"
//                                     {...register("applyGST")}
//                                     className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
//                                 />
//                                 <label className="text-sm font-semibold text-gray-700 cursor-pointer">Apply GST</label>
//                             </div>
                            
//                             {applyGST && (
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
//                                     <div>
//                                         <label className="text-xs font-medium text-gray-600 block mb-2">GST Rate (%)</label>
//                                         <select 
//                                             {...register("gstRate", { valueAsNumber: true })}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                                         >
//                                             <option value={0}>0% - No GST</option>
//                                             <option value={5}>5% - GST</option>
//                                             <option value={12}>12% - GST</option>
//                                             <option value={18}>18% - GST</option>
//                                             <option value={28}>28% - GST</option>
//                                         </select>
//                                     </div>
//                                     <div className="flex items-end pb-2">
//                                         <div className="text-sm">
//                                             <span className="text-gray-600">GST Amount: </span>
//                                             <span className="font-semibold text-green-600">+₹{gstAmount.toFixed(2)}</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Total Calculation */}
//                         <div className="space-y-2">
//                             <div className="flex justify-between items-center">
//                                 <span className="text-gray-700">Subtotal</span>
//                                 <span className="font-medium">₹{subtotal.toFixed(2)}</span>
//                             </div>
//                             {applyDiscount && discountValue > 0 && (
//                                 <div className="flex justify-between items-center text-red-600">
//                                     <span>Discount</span>
//                                     <span className="font-medium">-₹{discountValue.toFixed(2)}</span>
//                                 </div>
//                             )}
//                             {applyGST && gstAmount > 0 && (
//                                 <div className="flex justify-between items-center text-green-600">
//                                     <span>GST ({gstRate}%)</span>
//                                     <span className="font-medium">+₹{gstAmount.toFixed(2)}</span>
//                                 </div>
//                             )}
//                             <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
//                                 <span className="text-lg font-bold text-gray-800">Grand Total</span>
//                                 <span className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Payment Section */}
//                     <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
//                         <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
//                             <CreditCard size={20} className="text-blue-600" />
//                             Payment Details
//                         </h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div>
//                                 <label className="text-sm font-medium text-gray-700 block mb-2">Payment Status</label>
//                                 <select 
//                                     {...register("paymentStatus")} 
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                 >
//                                     <option value="Pending">Pending</option>
//                                     <option value="Partial">Partial</option>
//                                     <option value="Paid">Paid</option>
//                                 </select>
//                             </div>
                            
//                             {(paymentStatus === "Paid" || paymentStatus === "Partial") && (
//                                 <div>
//                                     <label className="text-sm font-medium text-gray-700 block mb-2">Paid Amount</label>
//                                     <input 
//                                         type="number" 
//                                         {...register("paidAmount", { valueAsNumber: true })} 
//                                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                         placeholder="Enter paid amount"
//                                         step="0.01"
//                                     />
//                                 </div>
//                             )}

//                             {(paymentStatus === "Paid" || paymentStatus === "Partial") && (
//                                 <div className="md:col-span-2">
//                                     <label className="text-sm font-medium text-gray-700 block mb-2">Payment Mode</label>
//                                     <select 
//                                         {...register("paymentMode")} 
//                                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                                     >
//                                         <option value="">Select Payment Mode</option>
//                                         <option value="Cash">Cash</option>
//                                         <option value="Card">Card</option>
//                                         <option value="UPI">UPI</option>
//                                         <option value="Bank Transfer">Bank Transfer</option>
//                                         <option value="Cheque">Cheque</option>
//                                         <option value="Other">Other</option>
//                                     </select>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Notes Section */}
//                     <div>
//                         <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
//                             <FileText size={14} className="text-gray-600" />
//                             Additional Notes
//                         </label>
//                         <textarea 
//                             {...register("notes")} 
//                             className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                             rows={4}
//                             placeholder="Add any special notes or terms..."
//                         ></textarea>
//                     </div>

//                     {/* Action Buttons */}
//                     <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
//                         <button 
//                             type="button" 
//                             onClick={() => navigate("/bills")} 
//                             className="px-8 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition transform hover:scale-105"
//                         >
//                             Cancel
//                         </button>
//                         <button 
//                             type="submit" 
//                             disabled={loading} 
//                             className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"
//                         >
//                             {loading ? (
//                                 <>
//                                     <Loader2 size={18} className="animate-spin" />
//                                     Saving...
//                                 </>
//                             ) : (
//                                 <>
//                                     <Save size={18} />
//                                     Save Bill
//                                 </>
//                             )}
//                         </button>
//                     </div>
//                 </form>
//             </div>

//             {/* Enhanced Modal for selecting items */}
//             <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} style={{ overlay: { zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.7)' }, content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '700px', padding: '0', borderRadius: '12px', border: 'none' } }}>
//                 <div className="bg-white rounded-lg">
//                     {/* Modal Header */}
//                     <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
//                         <h3 className="text-2xl font-bold">Select Items</h3>
//                         <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition">
//                             <X size={24}/>
//                         </button>
//                     </div>

//                     {/* Search */}
//                     <div className="p-6 border-b border-gray-200">
//                         <input 
//                             type="text" 
//                             placeholder="Search for products or kits..." 
//                             value={searchQuery} 
//                             onChange={e => setSearchQuery(e.target.value)} 
//                             className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//                         />
//                     </div>

//                     {/* Items List */}
//                     <div className="max-h-96 overflow-y-auto p-6 space-y-6">
//                         {/* Products Section */}
//                         {filteredProducts.length > 0 && (
//                             <div>
//                                 <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
//                                     Individual Products
//                                 </h4>
//                                 <div className="space-y-2">
//                                     {filteredProducts.map(item => (
//                                         <div 
//                                             key={item._id} 
//                                             onClick={() => handleSelectItem(item)} 
//                                             className="p-4 hover:bg-blue-50 cursor-pointer border border-gray-200 rounded-lg transition transform hover:shadow-md hover:scale-102"
//                                         >
//                                             <div className="flex justify-between items-start">
//                                                 <div className="flex-1">
//                                                     <p className="font-semibold text-gray-800">{item.name}</p>
//                                                     <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
//                                                 </div>
//                                                 <div className="text-right">
//                                                     <p className="text-lg font-bold text-blue-600">₹{(item as Product).price.toFixed(2)}</p>
//                                                     <p className="text-xs text-gray-500 mt-1">Stock: {(item as Product).quantity} {(item as Product).unitType}</p>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Kits Section */}
//                         {filteredKits.length > 0 && (
//                             <div>
//                                 <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
//                                     Kits
//                                 </h4>
//                                 <div className="space-y-2">
//                                     {filteredKits.map(item => (
//                                         <div 
//                                             key={item._id} 
//                                             onClick={() => handleSelectItem(item)} 
//                                             className="p-4 hover:bg-purple-50 cursor-pointer border border-gray-200 rounded-lg transition transform hover:shadow-md hover:scale-102 bg-gradient-to-br from-purple-50 to-white"
//                                         >
//                                             <div className="flex justify-between items-start">
//                                                 <div className="flex-1">
//                                                     <p className="font-semibold text-gray-800 flex items-center gap-2">
//                                                         <span className="text-purple-600 text-sm font-bold">KIT</span>
//                                                         {item.name}
//                                                     </p>
//                                                     <p className="text-sm text-gray-600 mt-2">
//                                                         Contains: {(item as Kit).products.map(p => p.product.name).join(', ')}
//                                                     </p>
//                                                     <p className="text-xs text-gray-500 mt-2">
//                                                         Items in kit: {(item as Kit).products.length}
//                                                     </p>
//                                                 </div>
//                                                 <div className="text-right">
//                                                     <p className="text-lg font-bold text-purple-600">₹{item.price.toFixed(2)}</p>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* No Results */}
//                         {filteredProducts.length === 0 && filteredKits.length === 0 && (
//                             <div className="text-center py-12">
//                                 <p className="text-gray-500 text-lg">No items found</p>
//                                 <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </Modal>
//         </div>
//     );
// };

// export default BillsFormV2;

import React, { useState, useEffect, useCallback } from "react";
import { createBill, updateBill, getBillById } from "../../services/billService";
import { Bill } from "../../types/models";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  PlusCircle,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  CalendarDays,
  User2,
  Phone,
  IndianRupee,
  FileText,
  CreditCard,
  Tag,
  Receipt,
} from "lucide-react";

type DiscountType = "Flat" | "Percentage";

type BillItem = {
  name: string;
  quantity: number;
  rate: number;
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  total: number;
  itemType?: "Simple" | "Product" | "Kit";
};

// ─── helpers ────────────────────────────────────────────────────────────────
function calcItemTotal(item: BillItem): { discountAmount: number; total: number } {
  const base = item.quantity * item.rate;
  const discountAmount =
    item.discountType === "Percentage"
      ? base * (item.discountValue / 100)
      : item.discountValue;
  const afterDiscount = base - discountAmount;
  const tax = afterDiscount * (item.taxRate / 100);
  return {
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    total: parseFloat((afterDiscount + tax).toFixed(2)),
  };
}

function calcBillSummary(
  items: BillItem[],
  billDiscountType: DiscountType,
  billDiscountValue: number
) {
  const subTotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const totalItemDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
  const totalTax = items.reduce((s, i) => {
    const base = i.quantity * i.rate - i.discountAmount;
    return s + base * (i.taxRate / 100);
  }, 0);

  const afterItemDiscounts = subTotal - totalItemDiscount;
  const billDiscountAmount =
    billDiscountType === "Percentage"
      ? afterItemDiscounts * (billDiscountValue / 100)
      : billDiscountValue;

  const grandTotal = afterItemDiscounts - billDiscountAmount + totalTax;

  return {
    subTotal: parseFloat(subTotal.toFixed(2)),
    totalItemDiscount: parseFloat(totalItemDiscount.toFixed(2)),
    billDiscountAmount: parseFloat(billDiscountAmount.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
}

const emptyItem = (): BillItem => ({
  name: "",
  quantity: 1,
  rate: 0,
  taxRate: 0,
  discountType: "Flat",
  discountValue: 0,
  discountAmount: 0,
  total: 0,
});

// ─── component ──────────────────────────────────────────────────────────────
const BillForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState<BillItem[]>([emptyItem()]);

  const [billDiscountType, setBillDiscountType] = useState<DiscountType>("Flat");
  const [billDiscountValue, setBillDiscountValue] = useState(0);

  const [paymentStatus, setPaymentStatus] = useState<"Pending" | "Paid" | "Partial">("Pending");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("");
  const [notes, setNotes] = useState("");

  const summary = calcBillSummary(items, billDiscountType, billDiscountValue);

  // ── fetch for edit ──
  const fetchBill = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBillById(id!);
      setCustomerName(data.customerName);
      setCustomerPhone(data.customerPhone);
      setBillDate(data.billDate.substring(0, 10));
      setItems(
        data.items.map((i: any) => ({
          ...emptyItem(),
          ...i,
        }))
      );
      setBillDiscountType(data.billDiscountType || "Flat");
      setBillDiscountValue(data.billDiscountValue || 0);
      setPaymentStatus((data.paymentStatus as any) || "Pending");
      setPaidAmount(data.paidAmount || 0);
      setPaymentMode(data.paymentMode || "");
      setNotes(data.notes || "");
    } catch {
      toast.error("Failed to load bill details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchBill();
  }, [isEdit, fetchBill]);

  // auto-set paidAmount when Paid
  useEffect(() => {
    if (paymentStatus === "Paid") setPaidAmount(summary.grandTotal);
    if (paymentStatus === "Pending") setPaidAmount(0);
  }, [paymentStatus, summary.grandTotal]);

  // ── item handlers ──
  const handleItemChange = (
    index: number,
    field: keyof BillItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      const { discountAmount, total } = calcItemTotal(current);
      updated[index] = { ...current, discountAmount, total };
      return updated;
    });
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  // ── submit ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const billData: Bill = {
      customerName,
      customerPhone,
      billDate,
      items: items.map((item) => ({
        ...item,
        itemType: (item.itemType || "Simple") as "Simple" | "Product" | "Kit",
      })),
      subTotal: summary.subTotal,
      billDiscountType,
      billDiscountValue,
      billDiscountAmount: summary.billDiscountAmount,
      totalTax: summary.totalTax,
      grandTotal: summary.grandTotal,
      paymentStatus,
      paidAmount,
      paymentMode,
      notes,
      billCopy: "",
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateBill(id!, billData);
        toast.success("Bill updated");
      } else {
        await createBill(billData);
        toast.success("Bill created");
      }
      navigate("/bills");
    } catch {
      toast.error("Failed to save bill");
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-600 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading bill...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-3xl font-bold text-gray-800">
          <FileText className="w-7 h-7 text-blue-600" />
          {isEdit ? "Edit Bill" : "Create Bill"}
        </h2>
        <button
          onClick={() => navigate("/bills")}
          type="button"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Customer & Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex gap-2 items-center">
              <User2 className="w-4 h-4" /> Customer Name
            </label>
            <input
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter name"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex gap-2 items-center">
              <Phone className="w-4 h-4" /> Phone
            </label>
            <input
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter phone"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex gap-2 items-center">
              <CalendarDays className="w-4 h-4" /> Bill Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Items
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 text-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase mb-1 px-1">
            <div className="col-span-3">Item Name</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate (₹)</div>
            <div className="col-span-1 text-center">Tax %</div>
            <div className="col-span-1 text-center">Disc Type</div>
            <div className="col-span-1 text-right">Disc Val</div>
            <div className="col-span-1 text-right">Disc (₹)</div>
            <div className="col-span-1 text-right">Total (₹)</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center mb-3 bg-gray-50 rounded-lg p-2"
            >
              {/* Name */}
              <input
                className="md:col-span-3 border border-gray-300 rounded-md px-2 py-1 text-sm"
                placeholder="Item Name"
                value={item.name}
                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                required
              />

              {/* Qty */}
              <input
                className="md:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm text-center"
                type="number"
                min={1}
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
              />

              {/* Rate */}
              <input
                className="md:col-span-2 border border-gray-300 rounded-md px-2 py-1 text-sm text-right"
                type="number"
                min={0}
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => handleItemChange(index, "rate", Number(e.target.value))}
              />

              {/* Tax Rate */}
              <input
                className="md:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm text-center"
                type="number"
                min={0}
                max={100}
                placeholder="Tax %"
                value={item.taxRate}
                onChange={(e) => handleItemChange(index, "taxRate", Number(e.target.value))}
              />

              {/* Discount Type */}
              <select
                className="md:col-span-1 border border-gray-300 rounded-md px-1 py-1 text-sm"
                value={item.discountType}
                onChange={(e) =>
                  handleItemChange(index, "discountType", e.target.value as DiscountType)
                }
              >
                <option value="Flat">₹ Flat</option>
                <option value="Percentage">% Off</option>
              </select>

              {/* Discount Value */}
              <input
                className="md:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm text-right"
                type="number"
                min={0}
                placeholder="0"
                value={item.discountValue}
                onChange={(e) =>
                  handleItemChange(index, "discountValue", Number(e.target.value))
                }
              />

              {/* Discount Amount (readonly) */}
              <div className="md:col-span-1 border border-gray-200 bg-red-50 rounded-md px-2 py-1 text-sm text-right text-red-600 font-medium">
                -{item.discountAmount.toFixed(2)}
              </div>

              {/* Total (readonly) */}
              <div className="md:col-span-1 border border-gray-200 bg-green-50 rounded-md px-2 py-1 text-sm text-right text-green-700 font-semibold">
                {item.total.toFixed(2)}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="md:col-span-1 text-red-400 hover:text-red-600 flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Bill-level Discount + Summary */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            {/* Bill Discount */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" />
                Bill-level Discount
              </label>
              <div className="flex gap-2 items-center">
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={billDiscountType}
                  onChange={(e) => setBillDiscountType(e.target.value as DiscountType)}
                >
                  <option value="Flat">₹ Flat</option>
                  <option value="Percentage">% Percentage</option>
                </select>
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={billDiscountValue}
                  onChange={(e) => setBillDiscountValue(Number(e.target.value))}
                />
                {billDiscountValue > 0 && (
                  <span className="text-sm text-orange-600 font-medium">
                    = ₹{summary.billDiscountAmount.toFixed(2)} off
                  </span>
                )}
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-w-[240px] space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sub Total</span>
                <span className="font-medium">₹{summary.subTotal.toFixed(2)}</span>
              </div>

              {summary.totalItemDiscount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Item Discounts</span>
                  <span>-₹{summary.totalItemDiscount.toFixed(2)}</span>
                </div>
              )}

              {summary.billDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-orange-500">
                  <span>
                    Bill Discount
                    {billDiscountType === "Percentage" ? ` (${billDiscountValue}%)` : ""}
                  </span>
                  <span>-₹{summary.billDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {summary.totalTax > 0 && (
                <div className="flex justify-between text-sm text-blue-500">
                  <span>Tax</span>
                  <span>+₹{summary.totalTax.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" /> Grand Total
                </span>
                <span className="text-green-700">₹{summary.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payment Status
            </label>
            <select
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
              value={paymentStatus}
              onChange={(e) => {
                const val = e.target.value as "Pending" | "Paid" | "Partial";
                setPaymentStatus(val);
              }}
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {(paymentStatus === "Paid" || paymentStatus === "Partial") && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Paid Amount</label>
                <input
                  className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
                  type="number"
                  value={paidAmount}
                  readOnly={paymentStatus === "Paid"}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                <select
                  className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="">Select Mode</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            onClick={() => navigate("/bills")}
            type="button"
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Saving..." : isEdit ? "Update Bill" : "Create Bill"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillForm;
