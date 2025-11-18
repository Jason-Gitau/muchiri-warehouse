'use client';

import { useEffect, useState } from 'react';
import { Package, Warehouse, ShoppingCart, TrendingUp } from 'lucide-react';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    // TODO: Fetch real stats from API
    // For now, using placeholder data
    setStats({
      totalProducts: 0,
      totalInventory: 0,
      pendingOrders: 0,
      lowStockItems: 0,
    });
  }, []);

  const cards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Inventory',
      value: stats.totalInventory,
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
      value: stats.lowStockItems,
      icon: TrendingUp,
      color: 'bg-red-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening in your warehouse.
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
            href="/manager/products"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Manage Products</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add or edit product catalog
            </p>
          </a>
          <a
            href="/manager/inventory"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-center"
          >
            <Warehouse className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Restock Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">
              Update warehouse stock levels
            </p>
          </a>
          <a
            href="/manager/orders"
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
