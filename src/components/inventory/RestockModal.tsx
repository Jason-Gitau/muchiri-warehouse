'use client';

import { useState } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  flavor: string;
  category: string;
  sku: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  product: Product;
}

interface RestockModalProps {
  product: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RestockModal({ product, onClose, onSuccess }: RestockModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate quantity
    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Quantity must be a positive integer');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.productId,
          quantity: quantityNum,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restock inventory');
      }

      // Success!
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const newQuantity = quantity ? product.quantity + parseInt(quantity, 10) : product.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Restock Inventory</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Product</p>
            <p className="text-lg font-semibold text-gray-900">{product.product.name}</p>
            <p className="text-sm text-gray-500">{product.product.flavor}</p>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Stock:</span>
                <span className="font-semibold text-gray-900">{product.quantity} units</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Reorder Level:</span>
                <span className="font-semibold text-gray-900">{product.reorderLevel} units</span>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Add <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              step="1"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter quantity to add"
            />
          </div>

          {/* New Quantity Preview */}
          {quantity && parseInt(quantity, 10) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    New Stock Level: {newQuantity} units
                  </p>
                  <p className="text-xs text-green-600">
                    ({parseInt(quantity, 10)} units will be added)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Add any notes about this restock..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !quantity || parseInt(quantity, 10) <= 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Restocking...' : 'Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
