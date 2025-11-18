'use client';

import { useCart } from '@/hooks/useCart';
import { X, Plus, Minus, Trash2, ShoppingCart as CartIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const router = useRouter();
  const { cartItems, updateQuantity, removeItem, getTotal, getSubtotal, clearCart } = useCart();

  const handleCheckout = () => {
    onClose();
    router.push('/distributor/checkout');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CartIcon className="w-6 h-6" />
            Shopping Cart
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 mb-6">
                Add some products to get started!
              </p>
              <button
                onClick={onClose}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-600">{item.flavor}</p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        KSh {Number(item.unitPrice).toLocaleString()} / unit
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1 hover:bg-red-100 rounded transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          try {
                            updateQuantity(item.productId, item.quantity + 1);
                          } catch (error) {
                            alert((error as Error).message);
                          }
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        disabled={item.availableStock ? item.quantity >= item.availableStock : false}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-bold text-gray-900">
                        KSh {getSubtotal(item).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {item.availableStock && (
                    <p className="text-xs text-gray-500 mt-2">
                      {item.availableStock} units available
                    </p>
                  )}
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear your cart?')) {
                    clearCart();
                  }
                }}
                className="w-full text-sm text-red-600 hover:text-red-700 py-2"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  KSh {getTotal().toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  KSh {getTotal().toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-semibold text-lg"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
