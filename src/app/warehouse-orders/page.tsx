'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Package,
  CheckCircle,
  Clock,
  User,
  XCircle,
  Eye,
  Search,
  Filter,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WarehouseOrder {
  id: string;
  orderNumber: string;
  distributorId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  fulfilledAt: string | null;
  notes: string | null;
  distributor: {
    businessName: string;
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

interface Distributor {
  id: string;
  businessName: string;
}

export default function WarehouseOrdersPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WarehouseOrder[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');
  const [processing, setProcessing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WarehouseOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Enhanced filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [distributorFilter, setDistributorFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchWarehouseOrders();
      fetchDistributors();
    }
  }, [userRole, filter]);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, paymentStatusFilter, distributorFilter, startDate, endDate]);

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

      // Only managers and owners can access this page
      if (role !== 'MANAGER' && role !== 'OWNER') {
        window.location.href = '/dashboard';
        return;
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchWarehouseOrders = async () => {
    try {
      setLoading(true);

      // Fetch all warehouse-to-distributor orders
      const { data: ordersData } = await supabase
        .from('Order')
        .select(`
          *,
          distributor:Distributor!Order_distributorId_fkey (
            businessName,
            user:User!Distributor_userId_fkey (
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
        .eq('orderType', 'WAREHOUSE_TO_DISTRIBUTOR')
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

      setOrders(filtered as WarehouseOrder[]);
    } catch (error) {
      console.error('Error fetching warehouse orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const { data } = await supabase
        .from('Distributor')
        .select('id, businessName')
        .eq('isActive', true);

      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching distributors:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Search filter (order number, distributor name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.distributor?.businessName.toLowerCase().includes(searchLower)
      );
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(
        (order) => order.paymentStatus === paymentStatusFilter
      );
    }

    // Distributor filter
    if (distributorFilter !== 'all') {
      filtered = filtered.filter(
        (order) => order.distributorId === distributorFilter
      );
    }

    // Date range filters
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (order) => new Date(order.createdAt) >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(
        (order) => new Date(order.createdAt) <= end
      );
    }

    setFilteredOrders(filtered);
  };

  const handleFulfillOrder = async (orderId: string) => {
    if (
      !confirm(
        'Are you sure you want to fulfill this order? This will reduce warehouse inventory.'
      )
    ) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Order fulfilled successfully!');
        fetchWarehouseOrders();
      } else {
        alert(data.error || 'Failed to fulfill order');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Failed to fulfill order');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (!reason) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Order cancelled successfully!');
        fetchWarehouseOrders();
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    } finally {
      setProcessing(false);
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
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
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
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          styles[paymentStatus as keyof typeof styles] ||
          'bg-gray-100 text-gray-800'
        }`}
      >
        {paymentStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading warehouse orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Orders</h1>
        <p className="text-gray-600 mt-2">
          Manage orders from distributors, track payments, and fulfill deliveries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{filteredOrders.length}</p>
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
                {
                  filteredOrders.filter(
                    (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
                  ).length
                }
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
                {filteredOrders.filter((o) => o.paymentStatus === 'UNPAID').length}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fulfilled</p>
              <p className="text-3xl font-bold text-gray-900">
                {filteredOrders.filter((o) => o.status === 'FULFILLED').length}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Payment Status */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Payment Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Distributor */}
          <select
            value={distributorFilter}
            onChange={(e) => setDistributorFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Distributors</option>
            {distributors.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.businessName}
              </option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start date"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End date"
          />
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
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {orders.length === 0 ? 'No warehouse orders yet' : 'No orders match your filters'}
            </p>
            <p className="text-gray-400">
              {orders.length === 0
                ? 'Orders from distributors will appear here'
                : 'Try adjusting your search or filter criteria'}
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
                    Distributor
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
                {filteredOrders.map((order) => (
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
                            {order.distributor?.businessName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.distributor?.user.email}
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
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {order.status !== 'FULFILLED' &&
                          order.status !== 'CANCELLED' &&
                          order.paymentStatus === 'PAID' && (
                            <button
                              onClick={() => handleFulfillOrder(order.id)}
                              disabled={processing}
                              className="text-green-600 hover:text-green-900 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Fulfill
                            </button>
                          )}
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
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

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedOrder.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  {getPaymentBadge(selectedOrder.paymentStatus)}
                </div>
              </div>

              {/* Distributor Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Distributor Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedOrder.distributor?.businessName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.distributor?.user.fullName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.distributor?.user.email}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Order Items
                </h3>
                <div className="space-y-2">
                  {selectedOrder.orderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {item.product.flavor} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          KSh {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          @ KSh {Number(item.unitPrice).toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    KSh {Number(selectedOrder.totalAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4 text-sm text-gray-600">
                <p>
                  Ordered: {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
                {selectedOrder.fulfilledAt && (
                  <p>
                    Fulfilled:{' '}
                    {new Date(selectedOrder.fulfilledAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
