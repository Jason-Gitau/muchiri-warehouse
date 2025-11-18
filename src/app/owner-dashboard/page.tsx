'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface OverviewMetrics {
  revenue: {
    currentMonth: number;
    lastMonth: number;
    ytd: number;
    percentageChange: number;
  };
  activeOrdersCount: number;
  totalDistributors: number;
  totalClients: number;
  inventoryValue: number;
}

interface RevenueData {
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

interface OrdersFulfilledData {
  byPeriod: {
    month: number;
    quarter: number;
    year: number;
  };
  avgFulfillmentTimeHours: number;
  ordersByStatus: {
    pending: number;
    completed: number;
    cancelled: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    ordersFulfilled: number;
  }>;
}

interface TopProduct {
  productId: string;
  name: string;
  flavor: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

interface DistributorPerformance {
  distributorId: string;
  distributorName: string;
  email: string;
  phoneNumber: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgFulfillmentTimeHours: number;
}

interface InventoryTurnoverData {
  period: number;
  highestTurnover: Array<any>;
  lowestTurnover: Array<any>;
  lowStockAlerts: Array<any>;
  summary: {
    totalProducts: number;
    totalInventoryValue: number;
    avgTurnoverRate: number;
    lowStockCount: number;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  timestamp: Date;
  title: string;
  description: string;
  status: string;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [ordersFulfilledData, setOrdersFulfilledData] =
    useState<OrdersFulfilledData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [distributorPerformance, setDistributorPerformance] = useState<
    DistributorPerformance[]
  >([]);
  const [inventoryTurnover, setInventoryTurnover] =
    useState<InventoryTurnoverData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [revenueByDistributor, setRevenueByDistributor] = useState(false);
  const [turnoverPeriod, setTurnoverPeriod] = useState(30);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is OWNER or MANAGER
    const response = await fetch('/api/users/me');
    const data = await response.json();

    if (data.user.role !== 'OWNER' && data.user.role !== 'MANAGER') {
      router.push('/dashboard');
      return;
    }

    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchRevenue(),
        fetchOrdersFulfilled(),
        fetchTopProducts(),
        fetchDistributorPerformance(),
        fetchInventoryTurnover(),
        fetchActivityFeed(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    const response = await fetch('/api/reports/overview');
    const data = await response.json();
    if (response.ok) {
      setOverview(data);
    }
  };

  const fetchRevenue = async () => {
    const url = `/api/reports/revenue?byDistributor=${revenueByDistributor}`;
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      setRevenueData(data);
    }
  };

  const fetchOrdersFulfilled = async () => {
    const response = await fetch('/api/reports/orders-fulfilled');
    const data = await response.json();
    if (response.ok) {
      setOrdersFulfilledData(data);
    }
  };

  const fetchTopProducts = async () => {
    const response = await fetch('/api/reports/top-products?limit=10');
    const data = await response.json();
    if (response.ok) {
      setTopProducts(data.topProducts || []);
    }
  };

  const fetchDistributorPerformance = async () => {
    const response = await fetch('/api/reports/distributor-performance');
    const data = await response.json();
    if (response.ok) {
      setDistributorPerformance(data.distributors || []);
    }
  };

  const fetchInventoryTurnover = async () => {
    const response = await fetch(
      `/api/reports/inventory-turnover?period=${turnoverPeriod}`
    );
    const data = await response.json();
    if (response.ok) {
      setInventoryTurnover(data);
    }
  };

  const fetchActivityFeed = async () => {
    const response = await fetch('/api/reports/activity-feed?limit=20');
    const data = await response.json();
    if (response.ok) {
      setActivities(data.activities || []);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchRevenue();
    }
  }, [revenueByDistributor]);

  useEffect(() => {
    if (!loading) {
      fetchInventoryTurnover();
    }
  }, [turnoverPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Owner Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Analytics and insights for your warehouse operations
          </p>
        </div>

        {/* Overview Metrics */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Current Month Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${overview.revenue.currentMonth.toFixed(2)}
                  </p>
                  <div className="flex items-center mt-2">
                    {overview.revenue.percentageChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={`text-sm ${
                        overview.revenue.percentageChange >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.abs(overview.revenue.percentageChange).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="h-10 w-10 text-blue-600" />
              </div>
            </div>

            {/* YTD Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">YTD Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${overview.revenue.ytd.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Year to date</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600" />
              </div>
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {overview.activeOrdersCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Pending & Processing
                  </p>
                </div>
                <ShoppingCart className="h-10 w-10 text-orange-600" />
              </div>
            </div>

            {/* Total Distributors */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Distributors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {overview.totalDistributors}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Active</p>
                </div>
                <Users className="h-10 w-10 text-purple-600" />
              </div>
            </div>

            {/* Inventory Value */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${overview.inventoryValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {overview.totalClients} clients
                  </p>
                </div>
                <Package className="h-10 w-10 text-indigo-600" />
              </div>
            </div>
          </div>
        )}

        {/* Revenue Trend Chart */}
        {revenueData && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Revenue Trend (Last 12 Months)
              </h2>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={revenueByDistributor}
                  onChange={(e) => setRevenueByDistributor(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">
                  Breakdown by Distributor
                </span>
              </label>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Orders Fulfilled & Top Products Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Orders Fulfilled */}
          {ordersFulfilledData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Orders Fulfilled
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {ordersFulfilledData.byPeriod.month}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">This Quarter</p>
                  <p className="text-2xl font-bold text-green-600">
                    {ordersFulfilledData.byPeriod.quarter}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">This Year</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {ordersFulfilledData.byPeriod.year}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    Avg Fulfillment Time
                  </span>
                  <span className="font-semibold text-gray-900">
                    {ordersFulfilledData.avgFulfillmentTimeHours} hours
                  </span>
                </div>

                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'Pending',
                            value: ordersFulfilledData.ordersByStatus.pending,
                          },
                          {
                            name: 'Completed',
                            value: ordersFulfilledData.ordersByStatus.completed,
                          },
                          {
                            name: 'Cancelled',
                            value: ordersFulfilledData.ordersByStatus.cancelled,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Top Selling Products */}
          {topProducts && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Top Selling Products
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {topProducts.slice(0, 10).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {product.flavor} • {product.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {product.unitsSold} units
                      </p>
                      <p className="text-sm text-gray-600">
                        ${product.revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Distributor Performance */}
        {distributorPerformance && distributorPerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Distributor Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Distributor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Total Orders
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Total Revenue
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Avg Order Value
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Avg Fulfillment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distributorPerformance.map((dist) => (
                    <tr key={dist.distributorId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {dist.distributorName}
                          </p>
                          <p className="text-sm text-gray-600">{dist.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {dist.totalOrders}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        ${dist.totalRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        ${dist.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {dist.avgFulfillmentTimeHours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory Turnover & Activity Feed Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inventory Turnover */}
          {inventoryTurnover && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Inventory Turnover
                </h2>
                <select
                  value={turnoverPeriod}
                  onChange={(e) => setTurnoverPeriod(parseInt(e.target.value))}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-green-600">
                    {inventoryTurnover.summary.totalProducts}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryTurnover.summary.lowStockCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Low Stock Alerts
                </h3>
                {inventoryTurnover.lowStockAlerts
                  .slice(0, 5)
                  .map((item: any) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-2 bg-red-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-gray-900">
                          {item.productName} ({item.flavor})
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {item.currentStock} left
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Recent Activity
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {activity.type === 'ORDER' && (
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    )}
                    {activity.type === 'PAYMENT' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {activity.type === 'STOCK_UPDATE' && (
                      <Package className="h-5 w-5 text-orange-600" />
                    )}
                    {activity.type === 'DISTRIBUTOR_ADDED' && (
                      <Users className="h-5 w-5 text-purple-600" />
                    )}
                    {activity.type === 'CLIENT_ADDED' && (
                      <Users className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
