'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ClientOrder {
  id: string;
  orderNumber: string;
  clientId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  notes: string | null;
  client: {
    businessName: string | null;
    user: {
      fullName: string;
      email: string;
    };
  };
  orderItems: Array<{
    quantity: number;
    unitPrice: number;
    product: {
      name: string;
      flavor: string;
    };
  }>;
}

export default function ClientOrdersPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'Cash',
    paymentNotes: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchClientOrders();
    }
  }, [userRole, filter]);

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

      // Only distributors can access this page
      if (role !== 'DISTRIBUTOR') {
        window.location.href = '/dashboard';
        return;
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchClientOrders = async () => {
    try {
      setLoading(true);

      // Fetch all orders and filter for DISTRIBUTOR_TO_CLIENT type
      const { data: ordersData } = await supabase
        .from('Order')
        .select(`
          *,
          client:Client!Order_clientId_fkey (
            businessName,
            user:User!Client_userId_fkey (
              fullName,
              email
            )
          ),
          orderItems:OrderItem (
            quantity,
            unitPrice,
            product:Product (
              name,
              flavor
            )
          )
        `)
        .eq('orderType', 'DISTRIBUTOR_TO_CLIENT')
        .order('createdAt', { ascending: false });

      let filtered = ordersData || [];

      // Apply status filter
      if (filter === 'pending') {
        filtered = filtered.filter(
          (o: any) => o.status === 'PENDING' || o.status === 'PROCESSING'
        );
      } else if (filter === 'fulfilled') {
        filtered = filtered.filter((o: any) => o.status === 'FULFILLED');
      }

      setOrders(filtered as ClientOrder[]);
    } catch (error) {
      console.error('Error fetching client orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });

      if (response.ok) {
        alert('Payment marked successfully!');
        setShowPaymentModal(false);
        setSelectedOrder(null);
        setPaymentForm({ paymentMethod: 'Cash', paymentNotes: '' });
        fetchClientOrders();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to mark payment');
      }
    } catch (error) {
      console.error('Error marking payment:', error);
      alert('Failed to mark payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to fulfill this order? This will reduce your inventory.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/fulfill-client`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Order fulfilled successfully!');
        fetchClientOrders();
      } else {
        alert(data.error || 'Failed to fulfill order');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Failed to fulfill order');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      FULFILLED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const styles = {
      PAID: 'bg-green-100 text-green-800',
      UNPAID: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[paymentStatus as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {paymentStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Orders</h1>
        <p className="text-gray-600 mt-2">
          Manage orders from your clients, track payments, and fulfill deliveries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
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
              <p className="text-3xl font-bold text-gray-900">
                {orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING').length}
              </p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Unpaid</p>
              <p className="text-3xl font-bold text-gray-900">
                {orders.filter((o) => o.paymentStatus === 'UNPAID').length}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fulfilled</p>
              <p className="text-3xl font-bold text-gray-900">
                {orders.filter((o) => o.status === 'FULFILLED').length}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 text-sm font-medium ${
                filter === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 text-sm font-medium ${
                filter === 'pending'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('fulfilled')}
              className={`px-6 py-3 text-sm font-medium ${
                filter === 'fulfilled'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Fulfilled
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No client orders yet</p>
            <p className="text-gray-400">
              Orders from your clients will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.client?.businessName || order.client?.user.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.client?.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.orderItems.map((item, idx) => (
                          <div key={idx}>
                            {item.product.name} x{item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        KSh {Number(order.totalAmount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(order.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {order.paymentStatus === 'UNPAID' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-4 h-4" />
                            Mark Paid
                          </button>
                        )}
                        {order.status !== 'FULFILLED' &&
                          order.status !== 'CANCELLED' &&
                          order.paymentStatus === 'PAID' && (
                            <button
                              onClick={() => handleFulfillOrder(order.id)}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Fulfill
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Mark Payment Received
            </h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Order: {selectedOrder.orderNumber}</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                Amount: KSh {Number(selectedOrder.totalAmount).toLocaleString()}
              </p>
            </div>
            <form onSubmit={handleMarkPaid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Cash">Cash</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Notes (optional)
                </label>
                <textarea
                  value={paymentForm.paymentNotes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentNotes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="e.g., Ref #12345, Paid via M-Pesa to 0700000000"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
