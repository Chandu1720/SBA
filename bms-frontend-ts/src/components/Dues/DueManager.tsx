import React, { useState, useEffect } from 'react';
import { getSupplierDues, getCustomerDues, } from "../../services/dueService";
import { clearInvoiceDue } from "../../services/invoiceService";
import { clearBillDue } from "../../services/billService";
import { DueInvoice, DueBill } from "../../types/models";

const DueManager: React.FC = () => {
  const [dueInvoices, setDueInvoices] = useState<DueInvoice[]>([]);
  const [dueBills, setDueBills] = useState<DueBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"supplier" | "customer">(
    "supplier"
  );

  const fetchDues = async () => {
    setError(null);
    try {
      const [invoicesResponse, billsResponse] = await Promise.all([
        getSupplierDues(),
        getCustomerDues(),
      ]);
      setDueInvoices(invoicesResponse);
      setDueBills(billsResponse);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch dues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const handleClearIndividual = async (id: string, type: "supplier" | "customer") => {
    const confirmMsg =
      type === "supplier"
        ? "Clear this supplier due?"
        : "Clear this customer due?";

    if (!window.confirm(confirmMsg)) return;

    try {
      if (type === "supplier") {
        await clearInvoiceDue(id);
      } else {
        await clearBillDue(id);
      }
      fetchDues();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to clear due");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const color =
      status === "Paid"
        ? "bg-green-100 text-green-700"
        : status === "Partial"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="text-center py-8 text-lg">Loading dues...</div>;
  if (error) return <div className="text-center py-8 text-red-500 font-semibold">{error}</div>;

  const isSupplierTab = activeTab === "supplier";
  const records = isSupplierTab ? dueInvoices : dueBills;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Due Management</h1>

      {/* TABS */}
      <div className="flex border-b mb-6">
        {["supplier", "customer"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            {tab === "supplier" ? "Supplier Dues" : "Customer Dues"}
          </button>
        ))}
      </div>

      {/* HEADER + CLEAR ALL */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {isSupplierTab ? "Supplier Outstanding Invoices" : "Customer Outstanding Bills"}
        </h2>

        
      </div>

      {records.length === 0 ? (
        <p className="text-gray-500">No outstanding dues 🎉</p>
      ) : (
        <>
          <div className="hidden lg:block bg-white border rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  {isSupplierTab ? (
                    <>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-left">Invoice Date</th>
                      <th className="px-4 py-3 text-left">Due Date</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Paid Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Bill Date</th>
                      <th className="px-4 py-3 text-left">Grand Total</th>
                      <th className="px-4 py-3 text-left">Paid Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y">
                {records.map((item: any) => {
                  const isOverdue =
                    isSupplierTab &&
                    new Date(item.dueDate) < new Date() &&
                    item.paymentStatus !== "Paid";

                  return (
                    <tr key={item._id} className={`${isOverdue ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-3">
                        {item.supplierId?.name || item.customerName}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(isSupplierTab ? item.invoiceDate : item.billDate).toLocaleDateString()}
                      </td>
                      {isSupplierTab && (
                        <td className="px-4 py-3">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {item.amount ?? item.grandTotal}
                      </td>
                      <td className="px-4 py-3">{item.paidAmount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.paymentStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            handleClearIndividual(item._id, isSupplierTab ? "supplier" : "customer")
                          }
                          className="text-white bg-green-600 hover:bg-green-700 text-xs px-3 py-1 rounded"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {records.map((item: any) => {
              const isOverdue =
                isSupplierTab &&
                new Date(item.dueDate) < new Date() &&
                item.paymentStatus !== "Paid";

              return (
                <div key={item._id} className={`bg-white p-4 rounded-lg shadow-sm border ${isOverdue ? "border-red-200 bg-red-50" : ""}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {item.supplierId?.name || item.customerName}
                    </h3>
                    <StatusBadge status={item.paymentStatus} />
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{isSupplierTab ? "Invoice" : "Bill"} Date: {new Date(isSupplierTab ? item.invoiceDate : item.billDate).toLocaleDateString()}</p>
                    {isSupplierTab && <p>Due Date: {new Date(item.dueDate).toLocaleDateString()}</p>}
                    <p>Amount: ₹{item.amount ?? item.grandTotal}</p>
                    <p>Paid: ₹{item.paidAmount}</p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        handleClearIndividual(item._id, isSupplierTab ? "supplier" : "customer")
                      }
                      className="text-white bg-green-600 hover:bg-green-700 text-sm px-3 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default DueManager;
