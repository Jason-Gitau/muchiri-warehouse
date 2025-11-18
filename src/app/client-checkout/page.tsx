'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function ClientCheckoutPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('User')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'CLIENT') {
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
      };

      const response = await fetch('/api/orders/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        clearCart();
        alert(`Order ${data.orderNumber} placed successfully! Total: KSh ${data.totalAmount.toLocaleString()}`);
        router.push('/my-orders');
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Continue Shopping
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-2">Review your order and complete checkout</p>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">
            Add some products to get started
          </p>
          <button
            onClick={() => router.push('/shop')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Order Items</h2>
              </div>

              <div className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <div key={item.productId} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.flavor}</p>
                        <p className="text-sm font-medium text-blue-600 mt-2">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-600 hover:text-red-700 p-2"
                        title="Remove from cart"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-600">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.availableQuantity}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.productId, parseInt(e.target.value) || 1)
                          }
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500">
                          (Max: {item.availableQuantity})
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Delivery Notes (Optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Add any delivery instructions or notes..."
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Items ({cart.reduce((sum, item) => sum + item.quantity, 0)}):</span>
                  <span>{cart.length} product{cart.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(getTotalAmount())}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(getTotalAmount())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Place Order
                    </>
                  )}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Payment Information</p>
                      <p>
                        Order will be created with payment status UNPAID. Payment will be
                        arranged with your distributor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
