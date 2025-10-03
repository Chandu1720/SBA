import axios from 'axios';
import React, { useEffect, useState, useMemo } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
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
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement
);

const Dashboard = () => {
  const [supplierCnt, setSupplierCnt] = useState([]);
  const [invoiceCnt, setInvoiceCnt] = useState([]);
  const [billCnt, setBillCnt] = useState([]);
  const [dueSupplierCnt, setDueSupplierCnt] = useState([]);
  const [dueCustomerCnt, setDueCustomerCnt] = useState([]);
  const [totalDues, setTotalDues] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [suppliers, invoices, bills, dueSuppliers, dueCustomers] =
          await Promise.all([
            axios.get(`${process.env.REACT_APP_API_URL}/api/suppliers`),
            axios.get(`${process.env.REACT_APP_API_URL}/api/invoices`),
            axios.get(`${process.env.REACT_APP_API_URL}/api/bills`),
            axios.get(`${process.env.REACT_APP_API_URL}/api/dues/suppliers`),
            axios.get(`${process.env.REACT_APP_API_URL}/api/dues/customers`),
          ]);

        setSupplierCnt(suppliers.data);
        setInvoiceCnt(invoices.data);
        setBillCnt(bills.data);
        setDueSupplierCnt(dueSuppliers.data);
        setDueCustomerCnt(dueCustomers.data);

        const supplierDues = dueSuppliers.data.reduce(
          (acc, curr) => acc + (curr.amount - (curr.paidAmount || 0)),
          0
        );
        const customerDues = dueCustomers.data.reduce(
          (acc, curr) => acc + (curr.grandTotal - (curr.paidAmount || 0)),
          0
        );
        setTotalDues(supplierDues + customerDues);

        const paidInvoices = invoices.data
          .filter((i) => i.paymentStatus === 'Paid')
          .reduce((acc, curr) => acc + curr.amount, 0);
        const paidBills = bills.data
          .filter((b) => b.paymentStatus === 'Paid')
          .reduce((acc, curr) => acc + curr.grandTotal, 0);
        setTotalPaid(paidInvoices + paidBills);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group invoices and bills by month for line chart
  const lineData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const countByMonth = (arr) => {
      const counts = new Array(12).fill(0);
      arr.forEach((item) => {
        if (item.createdAt) {
          const month = new Date(item.createdAt).getMonth();
          counts[month]++;
        }
      });
      return counts;
    };

    return {
      labels: months,
      datasets: [
        {
          label: 'Invoices',
          data: countByMonth(invoiceCnt),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.3)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Bills',
          data: countByMonth(billCnt),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.3)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [invoiceCnt, billCnt]);

  const barData = {
    labels: ['Suppliers', 'Invoices', 'Bills', 'Due Suppliers', 'Due Customers'],
    datasets: [
      {
        label: 'Count',
        data: [
          supplierCnt.length,
          invoiceCnt.length,
          billCnt.length,
          dueSupplierCnt.length,
          dueCustomerCnt.length,
        ],
        backgroundColor: '#3B82F6',
        borderRadius: 6,
      },
    ],
  };

  const pieData = {
    labels: ['Total Dues', 'Total Paid'],
    datasets: [
      {
        label: 'Amount',
        data: [totalDues, totalPaid],
        backgroundColor: ['#EF4444', '#10B981'],
        borderinlinesize: 2,
      },
    ],
  };

  const cardData = [
    { title: 'Suppliers', value: supplierCnt.length, color: 'border-blue-500', route: '/suppliers', icon: 'fa-truck' },
    { title: 'users', value: supplierCnt.length, color: 'border-blue-500', route: '/users', icon: "fa-solid fa-user" },
    { title: 'Invoices', value: invoiceCnt.length, color: 'border-green-500', route: '/invoices', icon: 'fa-file-invoice' },
    { title: 'Bills', value: billCnt.length, color: 'border-yellow-500', route: '/bills', icon: 'fa-receipt' },
    { title: 'Due Suppliers', value: dueSupplierCnt.length, color: 'border-red-500', route: '/dues', icon: 'fa-hand-holding-usd' },
    { title: 'Due Customers', value: dueCustomerCnt.length, color: 'border-purple-500', route: '/dues', icon: 'fa-users' },
    { title: 'Total Dues', value: `₹${totalDues.toFixed(2)}`, color: 'border-pink-500', route: '/dues', icon: 'fa-exclamation-circle' },
    { title: 'Total Paid', value: `₹${totalPaid.toFixed(2)}`, color: 'border-teal-500', route: '/invoices', icon: 'fa-check-circle' },
  ];

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        <div>
          <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
        <h2 className="text-3xl font-bold text-gray-800">📊 Dashboard Overview</h2>
        <p className="text-gray-600">Quick summary of your business data</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? <p>Loading...</p>
          : cardData.map((card, i) => (
              <div
                key={i}
                onClick={() => card.route && navigate(card.route)}
                className={`${card.color} border-l-4 bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <i className={`fas ${card.icon} text-gray-400`}></i>
                </div>
                <p className="text-3xl font-bold mt-3">{card.value}</p>
              </div>
            ))}
      </div>

      {/* Charts */}
      {!loading && (
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold mb-4">Overview Counts</h3>
            {supplierCnt.length + invoiceCnt.length + billCnt.length === 0
              ? <p className="text-gray-500">No data available</p>
              : <Bar data={barData} />}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold mb-4">Payment Status</h3>
            {totalDues + totalPaid === 0
              ? <p className="text-gray-500">No data available</p>
              : <Pie data={pieData} />}
          </div>

          <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
            <h3 className="font-bold mb-4">Monthly Invoices vs Bills</h3>
            <Line data={lineData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
