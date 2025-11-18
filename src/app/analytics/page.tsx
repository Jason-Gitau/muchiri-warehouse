'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Activity,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    fulfilledOrders: number;
    lowStockProducts: number;
  };
  revenueByMonth: Record<string, number>;
  topProducts: Array<{
    productName: string;
    flavor: string;
    unitsSold: number;
    revenue: number;
  }>;
  distributorPerformance: Array<{
    distributorName: string;
    contactName: string;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    avgFulfillmentTime: string;
  }>;
  inventoryTurnover: Array<{
    productName: string;
    flavor: string;
    currentStock: number;
    reorderLevel: number;
    unitsSold: number;
    turnoverRate: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    status: string;
    amount: number;
    timestamp: string;
  }>;
}

export default function AnalyticsPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchAnalytics();
    }
  }, [userRole, dateRange]);

  const checkUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: userData } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;
      setUserRole(role);

      // Only owners and managers can view analytics
      if (role !== 'OWNER' && role !== 'MANAGER') {
        window.location.href = '/dashboard';
        return;
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?days=${dateRange}`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track performance, revenue, and inventory insights
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                KSh {analytics.summary.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.summary.totalOrders}
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.summary.pendingOrders}
              </p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fulfilled</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.summary.fulfilledOrders}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.summary.lowStockProducts}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue by Month */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Revenue Trend</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(analytics.revenueByMonth).map(([month, revenue]) => {
              const maxRevenue = Math.max(...Object.values(analytics.revenueByMonth));
              const percentage = (revenue / maxRevenue) * 100;
              return (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{month}</span>
                    <span className="font-semibold text-gray-900">
                      KSh {revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Top Selling Products</h2>
          </div>
          <div className="space-y-3">
            {analytics.topProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-500">{product.flavor}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {product.unitsSold} units
                  </p>
                  <p className="text-sm text-green-600">
                    KSh {product.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distributor Performance */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distributor Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distributor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Fulfillment (days)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.distributorPerformance.map((dist, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dist.distributorName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{dist.contactName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dist.totalOrders}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      KSh {dist.totalRevenue.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      KSh {dist.avgOrderValue.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dist.avgFulfillmentTime}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Turnover */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Inventory Turnover
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnover Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.inventoryTurnover.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-500">{item.flavor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.currentStock}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.reorderLevel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.unitsSold}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.turnoverRate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'LOW_STOCK'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.status === 'LOW_STOCK' ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {analytics.recentActivity.slice(0, 10).map((activity) => (
            <div
              key={activity.id}
              className="flex justify-between items-center border-b border-gray-200 pb-4 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  KSh {activity.amount.toLocaleString()}
                </p>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    activity.status === 'FULFILLED'
                      ? 'bg-green-100 text-green-800'
                      : activity.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
