'use client';

import { useState } from 'react';
import { X, Package, AlertCircle, AlertTriangle } from 'lucide-react';

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

interface AdjustmentModalProps {
  product: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustmentModal({ product, onClose, onSuccess }: AdjustmentModalProps) {
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate quantity change
    const quantityNum = parseInt(quantityChange, 10);
    if (isNaN(quantityNum) || quantityNum === 0) {
      setError('Quantity change must be a non-zero integer');
      return;
    }

    // Validate notes
    if (!notes || notes.trim().length < 5) {
      setError('Notes must be at least 5 characters explaining the reason for adjustment');
      return;
    }

    // Check if adjustment would result in negative inventory
    const newQuantity = product.quantity + quantityNum;
    if (newQuantity < 0) {
      setError(`Cannot adjust: would result in negative quantity (current: ${product.quantity}, change: ${quantityNum})`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.productId,
          quantityChange: quantityNum,
          notes: notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust inventory');
      }

      // Success!
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const quantityNum = quantityChange ? parseInt(quantityChange, 10) : 0;
  const newQuantity = !isNaN(quantityNum) ? product.quantity + quantityNum : product.quantity;
  const isDecrease = quantityNum < 0;
  const isIncrease = quantityNum > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
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

          {/* Quantity Change Input */}
          <div>
            <label htmlFor="quantityChange" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Change <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantityChange"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              step="1"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter adjustment (use negative for decrease)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use positive numbers to increase stock, negative to decrease
            </p>
          </div>

          {/* New Quantity Preview */}
          {quantityChange && quantityNum !== 0 && (
            <div
              className={`border rounded-lg p-3 ${
                isDecrease
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {isDecrease ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                ) : (
                  <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDecrease ? 'text-yellow-800' : 'text-blue-800'
                    }`}
                  >
                    New Stock Level: {newQuantity} units
                  </p>
                  <p
                    className={`text-xs ${
                      isDecrease ? 'text-yellow-600' : 'text-blue-600'
                    }`}
                  >
                    {isDecrease
                      ? `${Math.abs(quantityNum)} units will be removed`
                      : `${quantityNum} units will be added`}
                  </p>
                  {newQuantity < 0 && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Warning: This would result in negative inventory!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warning for Decrease */}
          {isDecrease && newQuantity >= 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Decreasing Inventory
                  </p>
                  <p className="text-xs text-yellow-600">
                    Make sure to explain the reason in the notes below
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Input - Required */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              minLength={5}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Explain why you are adjusting the inventory (minimum 5 characters)..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Required: Explain the reason for this adjustment (e.g., damaged goods, inventory correction, etc.)
            </p>
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
              disabled={loading || !quantityChange || quantityNum === 0 || !notes || notes.trim().length < 5}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Adjusting...' : 'Adjust Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
