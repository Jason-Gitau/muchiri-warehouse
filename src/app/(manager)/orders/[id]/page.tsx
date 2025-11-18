'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { PaymentStatusBadge } from '@/components/orders/PaymentStatusBadge';
import { OrderStatus, PaymentStatus } from '@/types';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: {
    id: string;
    name: string;
    flavor: string;
    sku: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  fulfilledAt?: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
  distributor?: {
    id: string;
    businessName: string;
    phoneNumber: string;
  };
  warehouse?: {
    id: string;
    name: string;
    location: string;
  };
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch order' });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setMessage({ type: 'error', text: 'Error loading order' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsProcessing = async () => {
    if (!order) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Order marked as processing' });
        fetchOrder();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update order' });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage({ type: 'error', text: 'Error updating order' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async () => {
    if (!order) return;

    if (!window.confirm('Are you sure you want to fulfill this order? This will reduce warehouse inventory.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Order fulfilled successfully!' });
        fetchOrder();
      } else {
        const error = await response.json();
        setMessage({
          type: 'error',
          text: error.error || 'Failed to fulfill order',
        });
        if (error.details) {
          console.error('Fulfillment details:', error.details);
        }
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      setMessage({ type: 'error', text: 'Error fulfilling order' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a cancellation reason' });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Order cancelled successfully' });
        setShowCancelDialog(false);
        setCancelReason('');
        fetchOrder();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to cancel order' });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setMessage({ type: 'error', text: 'Error cancelling order' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Order not found</p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => router.push('/orders')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Orders
      </button>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-xl font-semibold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Order Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {order.orderNumber}
            </h1>
            <p className="text-gray-600">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <OrderStatusBadge status={order.status} size="lg" />
            </div>
            <div>
              <PaymentStatusBadge status={order.paymentStatus} size="lg" />
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Timeline</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-600">Created</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center">
              {order.status === 'PROCESSING' || order.status === 'FULFILLED' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <Clock className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <span className="text-sm text-gray-600">Processing</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center">
              {order.status === 'FULFILLED' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : order.status === 'CANCELLED' ? (
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
              ) : (
                <Clock className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <span className="text-sm text-gray-600">
                {order.status === 'CANCELLED' ? 'Cancelled' : 'Fulfilled'}
              </span>
            </div>
          </div>
          {order.fulfilledAt && (
            <p className="text-sm text-gray-600 mt-2">
              Fulfilled on {formatDate(order.fulfilledAt)}
            </p>
          )}
        </div>
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Distributor Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Distributor Information</h2>
          {order.distributor ? (
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Business Name:</span>
                <p className="font-medium">{order.distributor.businessName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Phone:</span>
                <p className="font-medium">{order.distributor.phoneNumber}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No distributor information</p>
          )}
        </div>

        {/* Warehouse Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Warehouse Information</h2>
          {order.warehouse ? (
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Name:</span>
                <p className="font-medium">{order.warehouse.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Location:</span>
                <p className="font-medium">{order.warehouse.location}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No warehouse information</p>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product?.name || 'Unknown Product'}
                      </p>
                      {item.product?.flavor && (
                        <p className="text-sm text-gray-600">{item.product.flavor}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {item.product?.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(Number(item.unitPrice))}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(Number(item.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-900">
                  Total Amount:
                </td>
                <td className="px-6 py-4 text-right text-2xl font-bold text-gray-900">
                  {formatCurrency(Number(order.totalAmount))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment & Notes */}
      {(order.paymentMethod || order.notes) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          {order.paymentMethod && (
            <div className="mb-4">
              <span className="text-sm text-gray-600">Payment Method:</span>
              <p className="font-medium">{order.paymentMethod}</p>
            </div>
          )}
          {order.notes && (
            <div>
              <span className="text-sm text-gray-600">Notes:</span>
              <p className="font-medium whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          {/* Mark as Processing */}
          {order.status === 'PENDING' && (
            <button
              onClick={handleMarkAsProcessing}
              disabled={actionLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {actionLoading ? 'Processing...' : 'Mark as Processing'}
            </button>
          )}

          {/* Fulfill Order */}
          {(order.status === 'PENDING' || order.status === 'PROCESSING') &&
            order.paymentStatus === 'PAID' && (
              <button
                onClick={handleFulfillOrder}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {actionLoading ? 'Processing...' : 'Fulfill Order'}
              </button>
            )}

          {/* Fulfill Order - Show message if not paid */}
          {(order.status === 'PENDING' || order.status === 'PROCESSING') &&
            order.paymentStatus !== 'PAID' && (
              <div className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-300">
                Order must be paid before fulfillment
              </div>
            )}

          {/* Cancel Order */}
          {order.status !== 'FULFILLED' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for cancelling this order:
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={actionLoading || !cancelReason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
