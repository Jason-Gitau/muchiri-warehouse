'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Package, ShoppingCart, Warehouse, TrendingUp } from 'lucide-react';

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
    const ownerCards = [
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
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here is your warehouse overview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {ownerCards.map((card) => {
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
              href="/analytics"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-center"
            >
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold">Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">
                View revenue and performance
              </p>
            </a>
            <a
              href="/orders"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Orders</h3>
              <p className="text-sm text-gray-600 mt-1">
                Monitor all orders
              </p>
            </a>
            <a
              href="/inventory"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
            >
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">
                View warehouse stock
              </p>
            </a>
          </div>
        </div>
      </div>
    );
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
