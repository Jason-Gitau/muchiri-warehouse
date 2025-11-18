'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DashboardStats {
  myInventory?: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent?: number;
  totalProducts?: number;
  totalInventory?: number;
  lowStockItems?: number;
}

interface OwnerStats {
  revenue: {
    currentMonth: number;
    lastMonth: number;
    yearToDate: number;
    growth: number;
  };
  orders: {
    active: number;
    total: number;
    pending: number;
    fulfilled: number;
    completed: number;
    currentMonth: number;
    lastMonth: number;
    growth: number;
    avgOrderValue: number;
  };
  users: {
    totalDistributors: number;
    totalClients: number;
  };
  inventory: {
    totalValue: number;
    totalProducts: number;
    lowStockProducts: number;
  };
  recentActivity: Array<{
    id: string;
    orderNumber: string;
    orderType: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    customerName: string;
    createdAt: string;
  }>;
}

function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwnerStats();
  }, []);

  const fetchOwnerStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/owner/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        console.error('Failed to fetch owner stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching owner stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      FULFILLED: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-green-100 text-green-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load dashboard data</p>
        <button
          onClick={fetchOwnerStats}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Complete overview of your warehouse operations and performance
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-purple-100 text-sm mb-1">Current Month</p>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.revenue.currentMonth)}
            </p>
            <div className="flex items-center mt-2">
              {stats.revenue.growth >= 0 ? (
                <>
                  <ArrowUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">
                    +{stats.revenue.growth.toFixed(1)}% from last month
                  </span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4 mr-1" />
                  <span className="text-sm">
                    {stats.revenue.growth.toFixed(1)}% from last month
                  </span>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-purple-100 text-sm mb-1">Last Month</p>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.revenue.lastMonth)}
            </p>
          </div>
          <div>
            <p className="text-purple-100 text-sm mb-1">Year to Date</p>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.revenue.yearToDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.orders.active}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.orders.pending} pending, {stats.orders.fulfilled}{' '}
                fulfilled
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Total Distributors */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Distributors</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.users.totalDistributors}
              </p>
              <p className="text-xs text-gray-500 mt-1">Active partners</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Clients */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.users.totalClients}
              </p>
              <p className="text-xs text-gray-500 mt-1">Active customers</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inventory Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats.inventory.totalValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.inventory.totalProducts} products
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Warehouse className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.orders.total}
              </p>
              <div className="flex items-center mt-1">
                {stats.orders.growth >= 0 ? (
                  <ArrowUp className="w-3 h-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-red-600 mr-1" />
                )}
                <span className="text-xs text-gray-500">
                  {Math.abs(stats.orders.growth).toFixed(1)}% this month
                </span>
              </div>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.orders.avgOrderValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per order</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.orders.completed}
              </p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.inventory.lowStockProducts}
              </p>
              <p className="text-xs text-gray-500 mt-1">Need restock</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Orders
            </h2>
            <a
              href="/warehouse-orders"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View all →
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent activity
              </p>
            ) : (
              stats.recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {activity.orderNumber}
                      </p>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.customerName} •{' '}
                      {activity.orderType === 'WAREHOUSE_TO_DISTRIBUTOR'
                        ? 'Distributor'
                        : 'Client'}{' '}
                      Order
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(activity.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a
              href="/analytics"
              className="block p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
            >
              <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">
                View detailed reports
              </p>
            </a>
            <a
              href="/warehouse-orders"
              className="block p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <ShoppingCart className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">All Orders</h3>
              <p className="text-sm text-gray-600 mt-1">Manage all orders</p>
            </a>
            <a
              href="/inventory"
              className="block p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
            >
              <Warehouse className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">View stock levels</p>
            </a>
            <a
              href="/distributors"
              className="block p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition"
            >
              <Users className="w-6 h-6 text-yellow-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Distributors</h3>
              <p className="text-sm text-gray-600 mt-1">Manage partners</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRoleAndStats();
  }, []);

  const fetchUserRoleAndStats = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Get user role
      const { data: userData } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;
      setUserRole(role);

      // Fetch stats based on role
      if (role === 'MANAGER') {
        await fetchManagerStats();
      } else if (role === 'DISTRIBUTOR') {
        await fetchDistributorStats();
      } else if (role === 'OWNER') {
        await fetchOwnerStats();
      } else if (role === 'CLIENT') {
        await fetchClientStats();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerStats = async () => {
    try {
      // Fetch products
      const { data: products } = await supabase.from('Product').select('id');

      // Fetch warehouse inventory
      const { data: inventory } = await supabase
        .from('WarehouseInventory')
        .select('quantity');

      // Fetch orders
      const { data: orders } = await supabase.from('Order').select('status');

      const pendingOrders =
        orders?.filter(
          (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
        ).length || 0;

      setStats({
        totalProducts: products?.length || 0,
        totalInventory: inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        pendingOrders,
        completedOrders: 0,
        lowStockItems: 0,
      });
    } catch (error) {
      console.error('Error fetching manager stats:', error);
    }
  };

  const fetchDistributorStats = async () => {
    try {
      // Fetch inventory count
      const inventoryResponse = await fetch('/api/distributors/inventory');
      const inventoryData = await inventoryResponse.json();
      const inventoryCount = inventoryData.inventory?.length || 0;

      // Fetch orders
      const ordersResponse = await fetch('/api/orders?type=distributor');
      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];

      // Calculate stats
      const pendingOrders = orders.filter(
        (o: any) => o.status === 'PENDING' || o.status === 'PROCESSING'
      ).length;

      const completedOrders = orders.filter((o: any) => o.status === 'FULFILLED')
        .length;

      const totalSpent = orders
        .filter((o: any) => o.paymentStatus === 'PAID')
        .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

      setStats({
        myInventory: inventoryCount,
        pendingOrders,
        completedOrders,
        totalSpent,
      });
    } catch (error) {
      console.error('Error fetching distributor stats:', error);
    }
  };

  const fetchOwnerStats = async () => {
    try {
      // Fetch owner analytics
      const { data: orders } = await supabase.from('Order').select('*');
      const pendingOrders = orders?.filter(
        (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
      ).length || 0;

      const completedOrders = orders?.filter((o) => o.status === 'FULFILLED')
        .length || 0;

      setStats({
        pendingOrders,
        completedOrders,
      });
    } catch (error) {
      console.error('Error fetching owner stats:', error);
    }
  };

  const fetchClientStats = async () => {
    try {
      // Fetch client orders
      const { data: orders } = await supabase.from('Order').select('status');

      const pendingOrders = orders?.filter(
        (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
      ).length || 0;

      const completedOrders = orders?.filter((o) => o.status === 'FULFILLED')
        .length || 0;

      setStats({
        pendingOrders,
        completedOrders,
      });
    } catch (error) {
      console.error('Error fetching client stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Manager Dashboard
  if (userRole === 'MANAGER') {
    const managerCards = [
      {
        title: 'Total Products',
        value: stats.totalProducts || 0,
        icon: Package,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Inventory',
        value: stats.totalInventory || 0,
        icon: Warehouse,
        color: 'bg-green-500',
      },
      {
        title: 'Pending Orders',
        value: stats.pendingOrders,
        icon: ShoppingCart,
        color: 'bg-yellow-500',
      },
      {
        title: 'Low Stock Items',
        value: stats.lowStockItems || 0,
        icon: TrendingUp,
        color: 'bg-red-500',
      },
    ];

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here is what is happening in your warehouse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {managerCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/products"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Manage Products</h3>
              <p className="text-sm text-gray-600 mt-1">
                Add or edit product catalog
              </p>
            </a>
            <a
              href="/inventory"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
            >
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Restock Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update warehouse stock levels
              </p>
            </a>
            <a
              href="/warehouse-orders"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <h3 className="font-semibold">Process Orders</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fulfill distributor orders
              </p>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Distributor Dashboard
  if (userRole === 'DISTRIBUTOR') {
    const distributorCards = [
      {
        title: 'My Inventory',
        value: stats.myInventory || 0,
        icon: Warehouse,
        color: 'bg-green-500',
      },
      {
        title: 'Pending Orders',
        value: stats.pendingOrders,
        icon: ShoppingCart,
        color: 'bg-yellow-500',
      },
      {
        title: 'Completed Orders',
        value: stats.completedOrders,
        icon: Package,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Spent',
        value: `KSh ${(stats.totalSpent || 0).toLocaleString()}`,
        icon: TrendingUp,
        color: 'bg-purple-500',
      },
    ];

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Distributor Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Manage your orders and inventory here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {distributorCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/products"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Browse Products</h3>
              <p className="text-sm text-gray-600 mt-1">
                View available warehouse products
              </p>
            </a>
            <a
              href="/distributor-orders"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <h3 className="font-semibold">Warehouse Orders</h3>
              <p className="text-sm text-gray-600 mt-1">
                Track orders from warehouse
              </p>
            </a>
            <a
              href="/inventory"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">My Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">
                View your current stock
              </p>
            </a>
            <a
              href="/client-orders"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold">Client Orders</h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage orders from clients
              </p>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Client Dashboard
  if (userRole === 'CLIENT') {
    const clientCards = [
      {
        title: 'Pending Orders',
        value: stats.pendingOrders,
        icon: ShoppingCart,
        color: 'bg-yellow-500',
      },
      {
        title: 'Completed Orders',
        value: stats.completedOrders,
        icon: Package,
        color: 'bg-green-500',
      },
    ];

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! View your orders and browse products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {clientCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/products"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Browse Products</h3>
              <p className="text-sm text-gray-600 mt-1">
                View available products
              </p>
            </a>
            <a
              href="/orders"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">My Orders</h3>
              <p className="text-sm text-gray-600 mt-1">
                Track your order status
              </p>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Owner Dashboard
  if (userRole === 'OWNER') {
    return <OwnerDashboard />;
  }

  // Default view for unknown roles
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back!
        </p>
      </div>
    </div>
  );
}
