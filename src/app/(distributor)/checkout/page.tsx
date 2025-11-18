'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, getTotal, clearCart } = useCart();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [distributorId, setDistributorId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if cart is empty
    if (cartItems.length === 0) {
      router.push('/distributor/products');
    }

    // Get current user and distributor ID
    fetchDistributorId();
  }, [cartItems]);

  const fetchDistributorId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch distributor record
      const response = await fetch('/api/distributors/me');
      if (response.ok) {
        const data = await response.json();
        setDistributorId(data.distributor.id);
      }
    } catch (error) {
      console.error('Error fetching distributor:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!distributorId) {
      alert('Unable to identify distributor. Please try again.');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      // Get warehouse ID (assuming first warehouse for MVP)
      const warehousesResponse = await fetch('/api/warehouses');
      const warehousesData = await warehousesResponse.json();
      const warehouseId = warehousesData.warehouses[0]?.id;

      if (!warehouseId) {
        throw new Error('No warehouse found');
      }

      // Prepare order data
      const orderData = {
        warehouseId,
        distributorId,
        orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: notes.trim() || undefined,
      };

      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const result = await response.json();

      // Clear cart
      clearCart();

      // Show success message
      alert(
        `Order placed successfully!\n\nOrder Number: ${result.order.orderNumber}\n\nPlease arrange payment with the warehouse manager. Your order will be processed once payment is confirmed.`
      );

      // Redirect to orders page
      router.push('/distributor/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Failed to place order: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          Checkout
        </h1>
        <p className="text-gray-600 mt-2">
          Review your order and complete your purchase
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Order Items</h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600">{item.flavor}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          KSh {Number(item.unitPrice).toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        KSh {(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Order Notes (Optional)</h2>
            </div>
            <div className="p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes for this order..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow sticky top-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Order Summary</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-gray-600">
                <span>Items</span>
                <span>{cartItems.length}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Total Quantity</span>
                <span>
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)} units
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total Amount</span>
                  <span className="text-green-600">
                    KSh {getTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Payment Notice</p>
                  <p>
                    Please arrange payment with the warehouse manager after placing your order.
                    Your order will be processed once payment is confirmed.
                  </p>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

              <button
                onClick={() => router.push('/distributor/products')}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
