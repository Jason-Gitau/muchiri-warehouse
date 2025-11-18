'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  X,
  Download,
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    flavor: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  fulfilledAt: string | null;
  receivedAt: string | null;
  orderItems: OrderItem[];
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  fulfilledOrders: number;
  receivedOrders: number;
}

export default function DistributorOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    fulfilledOrders: 0,
    receivedOrders: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [orders, filterStatus]);

  const checkAuthAndFetchOrders = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      await fetchDistributorOrders();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchDistributorOrders = async () => {
    try {
      setLoading(true);

      // Fetch warehouse-to-distributor orders for this distributor
      const { data: ordersData, error } = await supabase
        .from('Order')
        .select(
          `
          *,
          orderItems:OrderItem (
            id,
            quantity,
            unitPrice,
            product:Product (
              id,
              name,
              flavor
            )
          )
        `
        )
        .eq('orderType', 'WAREHOUSE_TO_DISTRIBUTOR')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const typedOrders = (ordersData || []) as Order[];
      setOrders(typedOrders);

      // Calculate stats
      const stats: Stats = {
        totalOrders: typedOrders.length,
        pendingOrders: typedOrders.filter((o) => o.status === 'PENDING').length,
        fulfilledOrders: typedOrders.filter((o) => o.status === 'FULFILLED')
          .length,
        receivedOrders: typedOrders.filter((o) => o.status === 'RECEIVED')
          .length,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filterStatus === 'all') {
      setFilteredOrders(orders);
    } else if (filterStatus === 'pending') {
      setFilteredOrders(orders.filter((o) => o.status === 'PENDING'));
    } else if (filterStatus === 'fulfilled') {
      setFilteredOrders(orders.filter((o) => o.status === 'FULFILLED'));
    } else if (filterStatus === 'received') {
      setFilteredOrders(orders.filter((o) => o.status === 'RECEIVED'));
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    if (
      !confirm(
        'Are you sure you want to mark this order as received? This will add the items to your inventory.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark order as received');
      }

      alert('Order marked as received successfully! Your inventory has been updated.');
      fetchDistributorOrders();
      setShowDetailsModal(false);
    } catch (error: any) {
      console.error('Error receiving order:', error);
      alert(error.message || 'Failed to mark order as received');
    }
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      FULFILLED: 'bg-blue-100 text-blue-800',
      RECEIVED: 'bg-green-100 text-green-800',
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

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      UNPAID: 'bg-red-100 text-red-800',
      PAID: 'bg-green-100 text-green-800',
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
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Warehouse Orders
        </h1>
        <p className="text-gray-600">
          View and manage your orders from the warehouse
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalOrders}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pendingOrders}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fulfilled Orders</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.fulfilledOrders}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Received Orders</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.receivedOrders}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                filterStatus === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Orders ({stats.totalOrders})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                filterStatus === 'pending'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending ({stats.pendingOrders})
            </button>
            <button
              onClick={() => setFilterStatus('fulfilled')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                filterStatus === 'fulfilled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fulfilled ({stats.fulfilledOrders})
            </button>
            <button
              onClick={() => setFilterStatus('received')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                filterStatus === 'received'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Received ({stats.receivedOrders})
            </button>
          </nav>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(order.totalAmount))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.orderItems.length} item(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewOrderDetails(order)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {order.status === 'FULFILLED' &&
                          order.status !== 'RECEIVED' && (
                            <button
                              onClick={() => handleReceiveOrder(order.id)}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1 ml-2"
                            >
                              <Download className="h-4 w-4" />
                              Receive
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order Details
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedOrder.orderNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <div className="mt-1">
                    {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                {selectedOrder.fulfilledAt && (
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDate(selectedOrder.fulfilledAt)}
                    </p>
                  </div>
                )}
                {selectedOrder.receivedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Received Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDate(selectedOrder.receivedAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Items
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product.name}
                            </div>
                            {item.product.flavor && (
                              <div className="text-sm text-gray-500">
                                {item.product.flavor}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(Number(item.unitPrice))}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              Number(item.unitPrice) * item.quantity
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-sm font-semibold text-gray-900"
                        >
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatCurrency(Number(selectedOrder.totalAmount))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedOrder.status === 'FULFILLED' &&
                  selectedOrder.status !== 'RECEIVED' && (
                    <button
                      onClick={() => handleReceiveOrder(selectedOrder.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Mark as Received
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
