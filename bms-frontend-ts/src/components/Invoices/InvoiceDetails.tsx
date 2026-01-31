import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getInvoiceById } from "../../services/invoiceService";
import { Invoice } from "../../types/models";
import { ArrowLeft, Edit, Download, FileText, Eye } from "lucide-react";
import { getShopProfile, ShopProfile } from "../../services/shopProfileService";
import api from "../../services/api"; // 💡 Import the api instance

import { useUser } from "../../context/UserContext";

const InvoiceDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const canEdit = user?.permissions.includes("invoices:edit");

  const handleViewFile = async () => {
    if (!invoice) return;

    try {
      // Open the invoice copy directly, which is now a Cloudinary URL
      window.open(invoice.invoiceCopy, '_blank');
    } catch (error: any) {
      console.error('Error viewing file:', error);
      alert('Failed to view file. Please check your permissions.');
    }
  };

  const handleDownloadFile = async () => {
    if (!invoice) return;

    try {
      // Download the invoice copy directly from its Cloudinary URL
      const link = document.createElement('a');
      link.href = invoice.invoiceCopy;
      link.download = `Invoice-${invoice.invoiceNumber}${invoice.invoiceCopy.substring(invoice.invoiceCopy.lastIndexOf('.'))}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please check your permissions.');
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const invoiceData = await getInvoiceById(id);
        setInvoice(invoiceData);
        const profileData = await getShopProfile();
        setShopProfile(profileData);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-8 text-red-500">
        <p>{error}</p>
        <Link to="/invoices" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center mt-8">
        <p>Invoice not found.</p>
        <Link to="/invoices" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const statusColor =
    invoice.paymentStatus === "Paid"
      ? "bg-green-100 text-green-800"
      : invoice.paymentStatus === "Pending"
      ? "bg-yellow-100 text-yellow-800"
      : invoice.paymentStatus === "Red"
      ? "bg-red-100 text-red-800"
      : ""; // Default or handle other statuses

  // 💡 Correctly construct the logo URL
  const logoUrl = shopProfile?.logo_url && shopProfile.logo_url.startsWith('http')
    ? shopProfile.logo_url
    : ''; // Use directly if absolute, otherwise none (old data requires re-upload)

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      {shopProfile && (
        <div className="text-center mb-6 border-b pb-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Shop Logo"
              className="h-20 mx-auto mb-2"
            />
          )}
          <h2 className="text-2xl font-bold text-gray-800">
            {shopProfile.shop_name}
          </h2>
          <p className="text-gray-600">{shopProfile.address}</p>
          <p className="text-gray-600">GSTIN: {shopProfile.gstin}</p>
          <p className="text-gray-600">Phone: {shopProfile.phone_number}</p>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Invoice Details</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          {canEdit && (
            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Edit size={16} />
              Edit Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Details Top Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Supplier Information
          </h2>
          <p className="mb-2">
            <strong>Supplier:</strong> {invoice.supplierId?.name}
          </p>
          <p className="mb-2">
            <strong>System Invoice #:</strong> {invoice.invoiceNumber}
          </p>
          {invoice.supplierInvoiceNumber && (
            <p className="mb-2">
              <strong>Supplier Invoice #:</strong> {invoice.supplierInvoiceNumber}
            </p>
          )}
          <p className="mb-2">
            <strong>Invoice Date:</strong>{" "}
            {new Date(invoice.invoiceDate).toLocaleDateString()}
          </p>
          <p>
            <strong>Due Date:</strong>{" "}
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Payment Details
          </h2>
          <p className="mb-2">
            <strong>Status:</strong>
            <span className={`ml-2 px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
              {invoice.paymentStatus}
            </span>
          </p>
          <p>
            <strong>Amount:</strong> ₹{invoice.amount.toFixed(2)}
          </p>

          {(invoice.paymentStatus === "Paid" ||
            invoice.paymentStatus === "Partial") && (
            <>
              <p>
                <strong>Paid Amount:</strong> ₹{invoice.paidAmount.toFixed(2)}
              </p>
              <p>
                <strong>Payment Mode:</strong> {invoice.paymentMode || "-"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Invoice File Section */}
      {invoice.invoiceCopy && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Invoice File
          </h3>
          <p className="text-gray-700 mb-4">
            <strong>File:</strong> {invoice.invoiceCopy.split('/').pop()}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleViewFile}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Eye size={16} />
              View File
            </button>
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Download size={16} />
              Download File
            </button>
          </div>
        </div>
      )}

      {/* Payment Proof File Section */}
      {invoice.paymentProof && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
            <FileText size={20} />
            {invoice.paymentMode} Proof
          </h3>
          <p className="text-gray-700 mb-4">
            <strong>File:</strong> {invoice.paymentProof.split('/').pop()}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${api.defaults.baseURL?.replace('/api', '')}${invoice.paymentProof}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Eye size={16} />
              View {invoice.paymentMode} Proof
            </a>
            <a
              href={`${api.defaults.baseURL?.replace('/api', '')}${invoice.paymentProof}`}
              download={invoice.paymentProof.split('/').pop()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              <Download size={16} />
              Download {invoice.paymentMode} Proof
            </a>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
          <p className="text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* No items for invoices yet... but section reserved for future use */}
      <div className="mt-6">
        <p className="text-gray-500 italic text-sm">
          Note: Line items feature not implemented for invoices yet.
        </p>
      </div>
    </div>
  );
};

export default InvoiceDetails;
