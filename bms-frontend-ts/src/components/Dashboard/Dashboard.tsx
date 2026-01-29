import React, { useEffect, useState, useMemo } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";

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
  DashboardData,
  Totals,
  CardData,
} from "../../types/models";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler
);

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    suppliers: [],
    invoices: [],
    bills: [],
    dueSuppliers: [],
    dueCustomers: [],
    recentBills: [],
    recentInvoices: [],
  });

  const [totals, setTotals] = useState<Totals>({ dues: 0, paid: 0, recived:0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // ✅ Generic helper for safe array normalization
  const ensureArray = <T,>(data: any, key?: string): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (key && Array.isArray(data?.[key])) return data[key] as T[];
    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching dashboard data...");

        const [
          suppliersResponse,
          invoicesResponse,
          billsResponse,
          dueSuppliers,
          dueCustomers,
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

        // ✅ Normalize API responses with proper typing
        const suppliers = ensureArray<Supplier>(suppliersResponse, "suppliers");
        const invoices = ensureArray<Invoice>(invoicesResponse, "invoices");
        const bills = ensureArray<Bill>(billsResponse, "bills");
        const dueSuppliersArr = ensureArray<DueInvoice>(
          dueSuppliers,
          "dueSuppliers"
        );
        const dueCustomersArr = ensureArray<DueBill>(
          dueCustomers,
          "dueCustomers"
        );

        // ✅ Safely compute financial data
        const recentBills = [...bills]
          .sort(
            (a, b) =>
              new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
          )
          .slice(0, 5);

        const recentInvoices = [...invoices]
          .sort(
            (a, b) =>
              new Date(b.invoiceDate).getTime() -
              new Date(a.invoiceDate).getTime()
          )
          .slice(0, 5);

        const supplierDues = dueSuppliersArr.reduce(
          (sum, s) => sum + (s.amount - (s.paidAmount || 0)),
          0
        );

        const customerDues = dueCustomersArr.reduce(
          (sum, c) => sum + (c.grandTotal - (c.paidAmount || 0)),
          0
        );

        const totalDues = supplierDues + customerDues;

        const paidInvoices = invoices
          .filter((i) => i.paymentStatus === "Paid")
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const paidBills = bills
          .filter((b) => b.paymentStatus === "Paid")
          .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

        const totalPaid = paidInvoices ;
        const totalRecived = paidBills;

        setData({
          suppliers,
          invoices,
          bills,
          dueSuppliers: dueSuppliersArr,
          dueCustomers: dueCustomersArr,
          recentBills,
          recentInvoices,
        });

        setTotals({ dues: totalDues, paid: totalPaid,recived:totalRecived });
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🧠 Helper for parsing month values
  const parseMonth = (value?: string | Date): number | null => {
    if (!value) return null;
    const d = typeof value === "string" ? new Date(value) : value;
    return Number.isNaN(d.getTime()) ? null : d.getMonth();
  };

  // 📊 Line chart: monthly invoices vs bills
  const lineData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const countByMonth = <T,>(
      arr: T[],
      dateGetter: (item: T) => string | Date | undefined
    ): number[] => {
      const counts = new Array(12).fill(0);
      (arr || []).forEach((item) => {
        const month = parseMonth(dateGetter(item));
        if (typeof month === "number") counts[month]++;
      });
      return counts;
    };

    return {
      labels: months,
      datasets: [
        {
          label: "Invoices",
          data: countByMonth<Invoice>(
            data.invoices,
            (i) => i.createdAt || i.invoiceDate
          ),
          borderColor: "#60A5FA",
          backgroundColor: "rgba(96,165,250,0.3)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Bills",
          data: countByMonth<Bill>(data.bills, (b) => b.billDate),
          borderColor: "#FBBF24",
          backgroundColor: "rgba(251,191,36,0.3)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [data.invoices, data.bills]);

  // 📊 Bar chart: entity counts
  const barData = useMemo(
    () => ({
      labels: [
        "Suppliers",
        "Invoices",
        "Bills",
        "Due Suppliers",
        "Due Customers",
      ],
      datasets: [
        {
          label: "Count",
          data: [
            data.suppliers.length,
            data.invoices.length,
            data.bills.length,
            data.dueSuppliers.length,
            data.dueCustomers.length,
          ],
          backgroundColor: "rgba(59,130,246,0.7)",
          borderRadius: 6,
        },
      ],
    }),
    [data]
  );

  // 📊 Pie chart: payment ratio
  const pieData = useMemo(
    () => ({
      labels: ["Total Dues", "Total Paid","Total Recived"],
      datasets: [
        {
          data: [totals.dues, totals.paid,totals.recived],
          backgroundColor: ["#EF4444", "#10B981","#09e639ff"],
          borderWidth: 2,
        },
      ],
    }),
    [totals]
  );

  // 💳 Summary cards
  const cardData: CardData[] = useMemo(
    () => [
      {
        title: "Suppliers",
        value: data.suppliers.length,
        color: "bg-gradient-to-br from-blue-500/20 to-blue-300/10",
        route: "/suppliers",
        icon: "fa-truck",
      },
      {
        title: "Invoices",
        value: data.invoices.length,
        color: "bg-gradient-to-br from-green-500/20 to-green-300/10",
        route: "/invoices",
        icon: "fa-file-invoice",
      },
      {
        title: "Bills",
        value: data.bills.length,
        color: "bg-gradient-to-br from-yellow-500/20 to-yellow-300/10",
        route: "/bills",
        icon: "fa-receipt",
      },
      {
        title: "Due Customers",
        value: data.dueCustomers.length,
        color: "bg-gradient-to-br from-red-500/20 to-red-300/10",
        route: "/dues",
        icon: "fa-users",
      },
      {
        title: "Total Dues",
        value: `₹${totals.dues.toFixed(2)}`,
        color: "bg-gradient-to-br from-pink-500/20 to-pink-300/10",
        route: "/dues",
        icon: "fa-exclamation-circle",
      },
      {
        title: "Total Paid to supplier",
        value: `₹${totals.paid.toFixed(2)}`,
        color: "bg-gradient-to-br from-teal-500/20 to-teal-300/10",
        route: "/invoices",
        icon: "fa-check-circle",
      },
      {
        title: "Total Paid From custmor",
        value: `₹${totals.recived.toFixed(2)}`,
        color: "bg-gradient-to-br from-teal-500/20 to-teal-300/10",
        route: "/bills",
        icon: "fa-check-circle",
      },
    ],
    [data, totals]
  );

  // 🌀 Loading & Error states
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

  // ✅ Main Dashboard
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6 sm:p-10 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center backdrop-blur-md bg-white/60 p-4 rounded-xl shadow-lg mb-10 border border-white/40">
        <h1 className="text-3xl font-bold text-gray-800">📈 Analytics Hub</h1>
        <div className="flex gap-4 mt-3 sm:mt-0">
          {["/suppliers", "/invoices", "/bills", "/dues"].map((link, i) => (
            <button
              key={i}
              onClick={() => navigate(link)}
              className="text-sm font-medium text-gray-700 bg-white/60 border border-gray-200 px-3 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition"
            >
              {link.replace("/", "").toUpperCase() || "HOME"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        {cardData.map((card, i) => (
          <div
            key={i}
            onClick={() => navigate(card.route)}
            className={`${card.color} backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-gray-800 font-semibold text-lg">
                {card.title}
              </h3>
              <i className={`fas ${card.icon} text-gray-500 text-2xl`} />
            </div>
            <p className="text-4xl font-bold mt-3 text-gray-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Overview Summary
          </h3>
          <div className="h-80">
            <Bar data={barData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Payment Ratio
          </h3>
          <div className="h-80">
            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Monthly Invoices vs Bills
          </h3>
          <div className="h-[420px]">
            <Line data={lineData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
