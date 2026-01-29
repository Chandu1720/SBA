import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getBillById } from "../../services/billService";
import { Bill } from "../../types/models";
import { ArrowLeft, Edit } from "lucide-react";
import { getShopProfile, ShopProfile } from "../../services/shopProfileService";

const BillDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        setLoading(true);
        setError(null);
        try {
          const billData = await getBillById(id);
          setBill(billData);
          const profileData = await getShopProfile();
          setShopProfile(profileData);
        } catch (err: any) {
          console.error(err);
          setError("Failed to fetch details.");
        } finally {
          setLoading(false);
        }
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
        <Link to="/bills" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Bills
        </Link>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center mt-8">
        <p>Bill not found.</p>
        <Link to="/bills" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Bills
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      {shopProfile && (
        <div className="text-center mb-6 border-b pb-4">
          {shopProfile.logo_url && (
            <img
              src={`http://localhost:5002${shopProfile.logo_url}`}
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Bill Details</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/bills")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <Link
            to={`/bills/edit/${bill._id}`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit size={16} />
            Edit Bill
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Customer Information
          </h2>
          <p>
            <strong>Name:</strong> {bill.customerName}
          </p>
          <p>
            <strong>Phone:</strong> {bill.customerPhone}
          </p>
          <p>
            <strong>Bill Date:</strong>{" "}
            {new Date(bill.billDate).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Payment Details
          </h2>
          <p>
            <strong>Status:</strong>
            <span
              className={`ml-2 px-2.5 py-1 text-xs font-semibold rounded-full ${
                bill.paymentStatus === "Paid"
                  ? "bg-green-100 text-green-800"
                  : bill.paymentStatus === "Pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {bill.paymentStatus}
            </span>
          </p>
          <p>
            <strong>Paid Amount:</strong> ₹{bill.paidAmount}
          </p>
          <p>
            <strong>Payment Mode:</strong> {bill.paymentMode}
          </p>
        </div>
      </div>

      {bill.notes && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
          <p className="text-gray-700">{bill.notes}</p>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Items</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bill.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    ₹{item.rate.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-800">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-2xl text-gray-900">
                  ₹{bill.grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {bill.billCopy && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">
            Bill Copy
          </h3>
          <a
            href={bill.billCopy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View / Download Bill Copy
          </a>
        </div>
      )}
    </div>
  );
};

export default BillDetails;