import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../services/api";

import { getInvoices, deleteInvoice } from "../../services/invoiceService";
import { Invoice } from "../../types/models";
import { useUser } from "../../context/UserContext";

const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const downloadRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useUser();

  const canCreate = user?.permissions.includes('invoices:create');
  const canUpdate = user?.permissions.includes('invoices:edit');
  const canDelete = user?.permissions.includes('invoices:delete');

  const handleViewFile = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/file`, {
        responseType: 'blob',
      });

      // Create a blob URL and open in new window
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file. Please check your permissions.');
    }
  };

  const handleDownloadFile = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file. Please check your permissions.');
    }
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() }),
      };

      const response = await getInvoices(params);

      if (response?.invoices) {
        setInvoices(response.invoices);
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
          setTotalInvoices(response.pagination.total || 0);
        }
      } else {
        setInvoices([]);
      }
    } catch (error) {
      toast.error("Failed to fetch invoices.");
      setInvoices([]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delay = setTimeout(() => fetchInvoices(), 400);
    return () => clearTimeout(delay);
  }, [fetchInvoices]);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDelete = async () => {
    if (!invoiceToDelete?._id) return;
    try {
      setDeleteLoading(true);
      await deleteInvoice(invoiceToDelete._id);
      toast.success("Invoice deleted successfully");
      setShowDeleteModal(false);
      fetchInvoices();
    } catch (error) {
      toast.error("Error deleting invoice");
      console.error(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = (type: string) => {
    setShowDownloadMenu(false);
    toast.success(`${type === "excel" ? "📊 Excel" : "📄 PDF"} — Coming Soon`);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600 mt-1">
            Review and track invoices
            {totalInvoices > 0 && ` • ${totalInvoices} invoices`}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setShowDownloadMenu((p) => !p)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
            >
              <Download size={16} />
              Download
            </button>

            <AnimatePresence>
              {showDownloadMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-20"
                >
                  <button className="px-4 py-2 text-sm hover:bg-gray-50" onClick={() => handleDownload("excel")}>
                    📊 Export Excel
                  </button>
                  <button className="px-4 py-2 text-sm hover:bg-gray-50" onClick={() => handleDownload("pdf")}>
                    📄 Export PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {canCreate && (
            <button
              onClick={() => navigate("/invoices/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Invoice
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
            fetchInvoices();
          }}
          className="flex gap-4"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices by supplier or status..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No invoices found</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      System Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Supplier Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Invoice Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {invoices.map((inv, i) => (
                    <motion.tr
                      key={inv._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 font-mono text-sm">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.supplierInvoiceNumber || '-'}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.supplierId?.name}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">₹{inv.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            inv.paymentStatus === "Paid"
                              ? "bg-green-100 text-green-800"
                              : inv.paymentStatus === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link
                          to={`/invoices/${inv._id}/details`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View details"
                        >
                          <Eye size={16} />
                        </Link>

                        {inv.invoiceCopy && (
                          <button
                            onClick={() => handleViewFile(inv._id || '', inv.invoiceNumber || 'Unknown')}
                            className="text-purple-600 hover:text-purple-900"
                            title="View invoice file"
                          >
                            <FileText size={16} />
                          </button>
                        )}

                        {inv.invoiceCopy && (
                          <button
                            onClick={() => handleDownloadFile(inv._id || '', inv.invoiceNumber || 'Unknown')}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Download invoice file"
                          >
                            <Download size={16} />
                          </button>
                        )}

                        {canUpdate && (
                          <Link
                            to={`/invoices/${inv._id}/edit`}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit size={16} />
                          </Link>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => {
                              setInvoiceToDelete(inv);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white p-4 rounded-lg shadow-sm border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{inv.supplierId?.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{inv.invoiceNumber}</p>
                      {inv.supplierInvoiceNumber && (
                        <p className="text-sm text-gray-500">Supplier #: {inv.supplierInvoiceNumber}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        inv.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-800"
                          : inv.paymentStatus === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Invoice Date: {formatDate(inv.invoiceDate)}</p>
                    <p className="font-bold">Amount: ₹{inv.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <Link
                      to={`/invoices/${inv._id}/details`}
                      className="text-blue-600 p-2 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {inv.invoiceCopy && (
                      <a
                        href={`http://localhost:5002/api/invoices/${inv._id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 p-2 hover:text-purple-900"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                    )}
                    {inv.invoiceCopy && (
                      <a
                        href={`http://localhost:5002/api/invoices/${inv._id}/download`}
                        className="text-indigo-600 p-2 hover:text-indigo-900"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {canUpdate && (
                      <Link
                        to={`/invoices/${inv._id}/edit`}
                        className="text-green-600 p-2 hover:text-green-900"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setInvoiceToDelete(inv);
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex justify-between text-sm">
                <span>
                  Page {currentPage} of {totalPages} • {totalInvoices} invoices
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 border rounded disabled:opacity-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && invoiceToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative"
            >
              <button onClick={() => setShowDeleteModal(false)} className="absolute top-3 right-3">
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>

              <h3 className="text-lg font-semibold mb-3 text-gray-900">Delete Invoice</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete invoice from{" "}
                <strong>{invoiceToDelete.supplierId?.name}</strong>?
                This cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {deleteLoading ? (
                    <>
                      <span className="animate-spin border-b-2 border-white w-4 h-4 rounded-full mr-2"></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvoicesList;
