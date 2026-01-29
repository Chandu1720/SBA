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
} from "lucide-react";

type BillItem = {
  name: string;
  quantity: number;
  rate: number;
  total: number;
  itemType?: 'Simple' | 'Product' | 'Kit';
};

const BillForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState<BillItem[]>([
    { name: "", quantity: 1, rate: 0, total: 0 },
  ]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<"Pending" | "Paid" | "Partial">("Pending");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("");
  const [notes, setNotes] = useState("");

  const fetchBill = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBillById(id!);
      setCustomerName(data.customerName);
      setCustomerPhone(data.customerPhone);
      setBillDate(data.billDate.substring(0, 10));
      setItems(data.items);
      setGrandTotal(data.grandTotal || 0);
      setPaymentStatus((data.paymentStatus as "Pending" | "Paid" | "Partial") || "Pending");
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

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    setGrandTotal(total);

    if (paymentStatus === "Paid") {
      setPaidAmount(total);
    }
  }, [items, paymentStatus]);

  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "name") current.name = String(value);
      if (field === "quantity") current.quantity = Number(value);
      if (field === "rate") current.rate = Number(value);

      current.total = current.quantity * current.rate;
      updated[index] = current;

      return updated;
    });
  };

  const addItem = () => setItems([...items, { name: "", quantity: 1, rate: 0, total: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const billData: Bill = {
      customerName,
      customerPhone,
      billDate,
      items: items.map(item => ({
        ...item,
        itemType: (item.itemType || 'Simple') as 'Simple' | 'Product' | 'Kit'
      })),
      grandTotal,
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
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
        {/* Customer & Bill Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex gap-2 items-center">
              <User2 className="w-4 h-4" />
              Customer Name
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
              <Phone className="w-4 h-4" />
              Phone
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
              <CalendarDays className="w-4 h-4" />
              Bill Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
            />
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Items
            </h3>

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 text-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-3">
              <input
                className="md:col-span-4 border border-gray-300 rounded-md shadow-sm px-2 py-1"
                placeholder="Item Name"
                value={item.name}
                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                required
              />
              <input
                className="md:col-span-2 border border-gray-300 rounded-md shadow-sm px-2 py-1"
                type="number"
                min={1}
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
              />
              <input
                className="md:col-span-2 border border-gray-300 rounded-md shadow-sm px-2 py-1"
                type="number"
                min={0}
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => handleItemChange(index, "rate", Number(e.target.value))}
              />
              <div className="md:col-span-2 flex gap-1 items-center">
                <IndianRupee className="w-4 h-4 text-gray-500" />
                <input
                  readOnly
                  className="w-full border border-gray-300 bg-gray-100 rounded-md shadow-sm px-2 py-1"
                  value={item.total}
                />
              </div>

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="md:col-span-2 text-red-500 hover:text-red-700 text-sm"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Grand Total */}
        <div className="border-t border-gray-200 pt-4 text-right">
          <p className="text-xl font-bold text-gray-800 flex items-center justify-end gap-2">
            <IndianRupee className="w-5 h-5 text-green-600" />
            {grandTotal.toFixed(2)}
          </p>
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Status
            </label>
            <select
              className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
              value={paymentStatus}
              onChange={(e) => {
                const val = e.target.value as "Pending" | "Paid" | "Partial";
                setPaymentStatus(val);
                if (val === "Paid") setPaidAmount(grandTotal);
                if (val === "Pending") setPaidAmount(0);
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
                <label className="text-sm font-medium text-gray-700">
                  Paid Amount
                </label>
                <input
                  className="border border-gray-300 rounded-md shadow-sm px-3 py-2"
                  type="number"
                  value={paidAmount}
                  readOnly={paymentStatus === "Paid"}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Payment Mode
                </label>
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
          ></textarea>
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
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? "Saving..." : isEdit ? "Update Bill" : "Create Bill"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillForm;