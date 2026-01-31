import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getBills, deleteBill, downloadBill } from "../../services/billService";
import { Bill } from "../../types/models";
import { useUser } from "../../context/UserContext";

const BillsList: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  const { user } = useUser();
  const canCreate = user?.role === "Admin";
  const canUpdate = user?.role === "Admin";
  const canDelete = user?.role === "Admin";

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() }),
      };

      const response = await getBills(params);
      if (response?.bills) {
        setBills(response.bills);
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
          setTotalBills(response.pagination.total || 0);
        }
      } else {
        setBills([]);
      }
    } catch (error) {
      toast.error("Failed to fetch bills.");
      console.error(error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchBills(), 400);
    return () => clearTimeout(debounce);
  }, [fetchBills]);

  const handleDelete = async () => {
    if (!billToDelete?._id) return;
    try {
      setDeleteLoading(true);
      await deleteBill(billToDelete._id);
      toast.success("Bill deleted successfully");
      setShowDeleteModal(false);
      fetchBills();
    } catch (error) {
      toast.error("Error deleting bill.");
      console.error(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // 🔹 NEW: Download a single bill
  const handleBillDownload = async (bill: Bill) => {
    try {
      toast.loading("Preparing download...", { id: "download" });

      const response = await downloadBill(bill._id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Bill-${bill.customerName}-${bill._id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Bill downloaded", { id: "download" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to download bill", { id: "download" });
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Management</h1>
          <p className="text-gray-600 mt-1">
            Manage bills and payment details
            {totalBills > 0 && ` • ${totalBills} total bills`}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          {canCreate && (
            <button
              onClick={() => navigate("/bills/new")}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchBills();
          }}
          className="flex gap-4"
        >
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bills by customer name, phone or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No bills found</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Bill Number</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Bill Date</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill, idx) => (
                    <motion.tr
                      key={bill._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-mono">{bill.billNumber}</td>
                      <td className="px-6 py-4 text-sm">{bill.customerName}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(bill.billDate)}</td>
                      <td className="px-6 py-4 text-sm font-bold">₹{bill.grandTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            bill.paymentStatus === "Paid"
                              ? "bg-green-100 text-green-700"
                              : bill.paymentStatus === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link to={`/bills/${bill._id}`} className="text-blue-600 p-1 hover:text-blue-900">
                            <Eye className="w-4 h-4" />
                          </Link>

                          {canUpdate && (
                            <Link to={`/bills/${bill._id}/edit`} className="text-green-600 p-1 hover:text-green-900">
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}

                          {/* 🔹 NEW Download */}
                          <button
                            onClick={() => handleBillDownload(bill)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => {
                                setBillToDelete(bill);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {bills.map((bill, idx) => (
                <motion.div
                  key={bill._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-white p-4 rounded-lg shadow-sm border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{bill.customerName}</h3>
                      <p className="text-sm text-gray-500 font-mono">{bill.billNumber}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        bill.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-700"
                          : bill.paymentStatus === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {bill.paymentStatus}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Bill Date: {formatDate(bill.billDate)}</p>
                    <p className="font-bold">Total: ₹{bill.grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <Link to={`/bills/${bill._id}`} className="text-blue-600 p-2 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {canUpdate && (
                      <Link to={`/bills/${bill._id}/edit`} className="text-green-600 p-2 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleBillDownload(bill)}
                      className="text-indigo-600 hover:text-indigo-900 p-2"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => {
                          setBillToDelete(bill);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 flex justify-between items-center border-t">
                <p className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-2 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-2 border rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteModal && billToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-lg max-w-md w-full"
            >
              <h3 className="text-lg font-bold mb-3">Delete Bill</h3>
              <p className="mb-6">
                Are you sure you want to delete bill for <strong>{billToDelete.customerName}</strong>?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BillsList;
