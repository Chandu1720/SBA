import React, { useEffect, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { useNavigate } from "react-router-dom";

import { getSuppliers } from "../../services/supplierService";
import { getInvoices } from "../../services/invoiceService";
import { getBills } from "../../services/billService";
import { getSupplierDues, getCustomerDues } from "../../services/dueService";
import {
  Supplier,
  Invoice,
  Bill,
  DueInvoice,
  DueBill,
} from "../../types/models";

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface DashboardV3Data {
  suppliers: Supplier[];
  invoices: Invoice[];
  bills: Bill[];
  dueSuppliers: DueInvoice[];
  dueCustomers: DueBill[];
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  color: string;
  route: string;
  icon: string;
  onClick: (route: string) => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  color,
  route,
  icon,
  onClick,
}) => (
  <div
    onClick={() => onClick(route)}
    className={`${color} backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
  >
    <div className="flex justify-between items-center">
      <h3 className="text-gray-800 font-semibold text-lg">{title}</h3>
      <i className={`fas ${icon} text-gray-500 text-2xl`} />
    </div>
    <p className="text-4xl font-bold mt-3 text-gray-900">{value}</p>
  </div>
);

const DashboardV3: React.FC = () => {
  const [data, setData] = useState<DashboardV3Data>({
    suppliers: [],
    invoices: [],
    bills: [],
    dueSuppliers: [],
    dueCustomers: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const ensureArray = <T,>(input: any, key?: string): T[] => {
    if (Array.isArray(input)) return input as T[];
    if (key && Array.isArray(input?.[key])) return input[key] as T[];
    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          suppliersRes,
          invoicesRes,
          billsRes,
          dueSuppliersRes,
          dueCustomersRes,
        ] = await Promise.all([
          getSuppliers().catch((e) => {
            console.error("❌ Suppliers fetch failed:", e);
            return [];
          }),
          getInvoices().catch((e) => {
            console.error("❌ Invoices fetch failed:", e);
            return [];
          }),
          getBills().catch((e) => {
            console.error("❌ Bills fetch failed:", e);
            return [];
          }),
          getSupplierDues().catch((e) => {
            console.error("❌ Supplier dues fetch failed:", e);
            return [];
          }),
          getCustomerDues().catch((e) => {
            console.error("❌ Customer dues fetch failed:", e);
            return [];
          }),
        ]);

        setData({
          suppliers: ensureArray<Supplier>(suppliersRes, "suppliers"),
          invoices: ensureArray<Invoice>(invoicesRes, "invoices"),
          bills: ensureArray<Bill>(billsRes, "bills"),
          dueSuppliers: ensureArray<DueInvoice>(dueSuppliersRes, "dueSuppliers"),
          dueCustomers: ensureArray<DueBill>(dueCustomersRes, "dueCustomers"),
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const {
    totalIncome,
    totalExpenses,
    netProfit,
    pendingInvoicesCount,
    pendingBillsCount,
    pendingSupplierDuesAmount,
    pendingCustomerDuesAmount,
    recentInvoices,
    recentBills,
  } = useMemo(() => {
    const totalIncome = data.invoices.reduce(
      (sum, invoice) => sum + (invoice.amount || 0),
      0
    );
    const totalExpenses = data.bills.reduce(
      (sum, bill) => sum + (bill.grandTotal || 0),
      0
    );
    const netProfit = totalExpenses - totalIncome;

    const pendingInvoicesCount = data.invoices.filter(
      (invoice) => invoice.paymentStatus !== "Paid"
    ).length;
    const pendingBillsCount = data.bills.filter(
      (bill) => bill.paymentStatus !== "Paid"
    ).length;

    const pendingSupplierDuesAmount = data.dueSuppliers.reduce(
      (sum, s) => sum + (s.amount - (s.paidAmount || 0)),
      0
    );
    const pendingCustomerDuesAmount = data.dueCustomers.reduce(
      (sum, c) => sum + (c.grandTotal - (c.paidAmount || 0)),
      0
    );

    const sortedInvoices = [...data.invoices].sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    );
    const recentInvoices = sortedInvoices.slice(0, 5);

    const sortedBills = [...data.bills].sort(
      (a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
    );
    const recentBills = sortedBills.slice(0, 5);

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      pendingInvoicesCount,
      pendingBillsCount,
      pendingSupplierDuesAmount,
      pendingCustomerDuesAmount,
      recentInvoices,
      recentBills,
    };
  }, [data]);

  const financialSummaryChartData = useMemo(() => {
    return {
      labels: ["Total Income", "Total Expenses", "Net Profit"],
      datasets: [
        {
          label: "Amount (₹)",
          data: [totalIncome, totalExpenses, netProfit],
          backgroundColor: ["#34D399", "#EF4444", "#60A5FA"], // Green, Red, Blue
          borderRadius: 6,
        },
      ],
    };
  }, [totalIncome, totalExpenses, netProfit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
        <p className="text-red-600 text-xl font-medium mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6 sm:p-10 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center backdrop-blur-md bg-white/60 p-4 rounded-xl shadow-lg mb-10 border border-white/40">
        <h1 className="text-3xl font-bold text-gray-800">📊 Financial Overview</h1>
        <div className="flex gap-4 mt-3 sm:mt-0">
          {["/invoices", "/bills", "/dues"].map((link, i) => (
            <button
              key={i}
              onClick={() => navigate(link)}
              className="text-sm font-medium text-gray-700 bg-white/60 border border-gray-200 px-3 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition"
            >
              {link.replace("/", "").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <SummaryCard
          title="Total Income"
          value={`₹${totalExpenses.toFixed(2)}`}
          color="bg-gradient-to-br from-green-500/20 to-green-300/10"
          route="/bills"
          icon="fa-money-bill-alt"
          onClick={navigate}
        />
        <SummaryCard
          title="Total Expenses"
          value={`₹${totalIncome.toFixed(2)}`}
          color="bg-gradient-to-br from-red-500/20 to-red-300/10"
          route="/invoices"
          icon="fa-file-invoice-dollar"
          onClick={navigate}
        />
        <SummaryCard
          title="Net Profit"
          value={`₹${netProfit.toFixed(2)}`}
          color="bg-gradient-to-br from-blue-500/20 to-blue-300/10"
          route="/"
          icon="fa-chart-line"
          onClick={navigate}
        />
      </div>

      {/* Pending Items & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Financial Summary
          </h3>
          <div className="h-80">
            <Bar
              data={financialSummaryChartData}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Pending Documents Overview
          </h3>
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center bg-yellow-100/50 p-3 rounded-lg border border-yellow-200">
              <span className="text-gray-700 font-medium">Pending Invoices</span>
              <span className="text-yellow-700 font-bold">{pendingInvoicesCount}</span>
            </div>
            <div className="flex justify-between items-center bg-orange-100/50 p-3 rounded-lg border border-orange-200">
              <span className="text-gray-700 font-medium">Pending Bills</span>
              <span className="text-orange-700 font-bold">{pendingBillsCount}</span>
            </div>
            <div className="flex justify-between items-center bg-red-100/50 p-3 rounded-lg border border-red-200">
              <span className="text-gray-700 font-medium">Supplier Dues</span>
              <span className="text-red-700 font-bold">₹{pendingSupplierDuesAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100/50 p-3 rounded-lg border border-purple-200">
              <span className="text-gray-700 font-medium">Customer Dues</span>
              <span className="text-purple-700 font-bold">₹{pendingCustomerDuesAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Recent Invoices
          </h3>
          {recentInvoices.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentInvoices.map((invoice) => (
                <li key={invoice._id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Invoice #{invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.invoiceDate).toLocaleDateString()} -{" "}
                      {invoice.invoiceDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    ₹{invoice.amount?.toFixed(2)} ({invoice.paymentStatus})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent invoices.</p>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Recent Bills
          </h3>
          {recentBills.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentBills.map((bill) => (
                <li key={bill._id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Bill #{bill.billNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(bill.billDate).toLocaleDateString()} -{" "}
                      {bill.billDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      bill.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    ₹{bill.grandTotal?.toFixed(2)} ({bill.paymentStatus})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent bills.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardV3;
