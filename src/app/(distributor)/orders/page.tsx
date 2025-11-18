'use client';

import { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  itemCount: number;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    name: string;
    flavor: string;
  };
}

export default function DistributorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders?type=distributor');
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReceived = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Mark order ${orderNumber} as received? This will add the items to your inventory.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/receive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark order as received');
      }

      alert('Order marked as received! Items have been added to your inventory.');
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error marking order as received:', error);
      alert(`Failed to mark order as received: ${(error as Error).message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle },
      FULFILLED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {status}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const badges = {
      UNPAID: { bg: 'bg-red-100', text: 'text-red-800' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
    };

    const badge = badges[paymentStatus as keyof typeof badges] || badges.UNPAID;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {paymentStatus}
      </span>
    );
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-2">
          Track and manage your orders from the warehouse
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all'
              ? "You haven't placed any orders yet"
              : `No ${statusFilter.toLowerCase()} orders`}
          </p>
          <a
            href="/distributor/products"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Browse Products
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      KSh {Number(order.totalAmount).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Items</p>
                    <p className="font-semibold">{order.itemCount} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Order Status</p>
                    {getStatusBadge(order.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                    {getPaymentBadge(order.paymentStatus)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                  </button>

                  {order.status === 'FULFILLED' && (
                    <button
                      onClick={() => handleMarkAsReceived(order.id, order.orderNumber)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              </div>

              {/* Order Details (Expandable) */}
              {expandedOrder === order.id && order.items && (
                <div className="border-t bg-gray-50 p-6">
                  <h4 className="font-semibold mb-4">Order Items</h4>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white p-4 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">
                              {item.product.name}
                            </h5>
                            <p className="text-sm text-gray-600">{item.product.flavor}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            KSh {Number(item.unitPrice).toLocaleString()} × {item.quantity}
                          </p>
                          <p className="text-sm text-gray-600">
                            Subtotal: KSh {Number(item.subtotal).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
