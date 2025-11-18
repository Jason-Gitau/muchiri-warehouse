'use client';

import { useEffect, useState } from 'react';
import { Package, ShoppingCart, Warehouse, TrendingUp } from 'lucide-react';

export default function DistributorDashboard() {
  const [stats, setStats] = useState({
    myInventory: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

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

      const completedOrders = orders.filter(
        (o: any) => o.status === 'FULFILLED'
      ).length;

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
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'My Inventory',
      value: stats.myInventory,
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
      value: `KSh ${stats.totalSpent.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Distributor Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Manage your orders and inventory here.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => {
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

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/distributor/products"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Browse Products</h3>
            <p className="text-sm text-gray-600 mt-1">
              View available warehouse products
            </p>
          </a>
          <a
            href="/distributor/orders"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-center"
          >
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <h3 className="font-semibold">My Orders</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track your order status
            </p>
          </a>
          <a
            href="/distributor/inventory"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <Warehouse className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">My Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">
              View your current stock
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
