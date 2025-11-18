'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Package,
  Plus,
  Edit,
  Search,
  AlertTriangle,
  TrendingUp,
  X,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  flavor: string | null;
  category: string | null;
  sku: string;
  unitPrice: number;
}

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  lastRestockedAt: string | null;
  updatedAt: string;
  product: Product;
  isLowStock: boolean;
}

export default function InventoryPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Modals
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [restockForm, setRestockForm] = useState({ quantity: '', notes: '' });
  const [adjustForm, setAdjustForm] = useState({ quantityChange: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthAndFetchInventory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, searchTerm, showLowStockOnly, categoryFilter]);

  const checkAuthAndFetchInventory = async () => {
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

      setUserRole(userData?.role);

      // Only managers and owners can manage inventory
      if (userData?.role !== 'MANAGER' && userData?.role !== 'OWNER') {
        router.push('/dashboard');
        return;
      }

      await fetchInventory();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory');
      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory || []);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(
            data.inventory
              .map((item: InventoryItem) => item.product?.category)
              .filter(Boolean)
          )
        ) as string[];
        setCategories(uniqueCategories);
      } else {
        console.error('Failed to fetch inventory:', data.error);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...inventory];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.product?.name.toLowerCase().includes(searchLower) ||
          item.product?.sku.toLowerCase().includes(searchLower) ||
          item.product?.flavor?.toLowerCase().includes(searchLower)
      );
    }

    // Low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter((item) => item.isLowStock);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.product?.category === categoryFilter);
    }

    setFilteredInventory(filtered);
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const quantity = parseInt(restockForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          quantity,
          notes: restockForm.notes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Stock restocked successfully!');
        setShowRestockModal(false);
        setRestockForm({ quantity: '', notes: '' });
        setSelectedItem(null);
        await fetchInventory();
      } else {
        alert(data.error || 'Failed to restock');
      }
    } catch (error) {
      console.error('Error restocking:', error);
      alert('Failed to restock inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const quantityChange = parseInt(adjustForm.quantityChange);
    if (isNaN(quantityChange) || quantityChange === 0) {
      alert('Please enter a valid quantity change (can be positive or negative)');
      return;
    }

    if (!adjustForm.notes.trim()) {
      alert('Please provide a reason for the adjustment');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          quantityChange,
          notes: adjustForm.notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Inventory adjusted successfully!');
        setShowAdjustModal(false);
        setAdjustForm({ quantityChange: '', notes: '' });
        setSelectedItem(null);
        await fetchInventory();
      } else {
        alert(data.error || 'Failed to adjust inventory');
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Failed to adjust inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockForm({ quantity: '', notes: '' });
    setShowRestockModal(true);
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustForm({ quantityChange: '', notes: '' });
    setShowAdjustModal(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const lowStockCount = inventory.filter((item) => item.isLowStock).length;
  const totalValue = inventory.reduce(
    (sum, item) => sum + item.quantity * Number(item.product?.unitPrice || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Inventory</h1>
        <p className="text-gray-600 mt-2">
          Manage your warehouse stock levels and restock products
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-600">{lowStockCount}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">
                KSh {totalValue.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or flavor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Filter */}
          <div>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                showLowStockOnly
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <AlertTriangle className="inline-block h-5 w-5 mr-2" />
              Low Stock Only
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Restocked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>No inventory items found</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    className={item.isLowStock ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.product?.name}
                        </div>
                        {item.product?.flavor && (
                          <div className="text-sm text-gray-500">
                            {item.product.flavor}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.product?.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.product?.category || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span
                          className={`text-lg font-semibold ${
                            item.isLowStock ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {item.isLowStock && (
                          <AlertTriangle className="h-5 w-5 text-red-600 ml-2" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.reorderLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(item.lastRestockedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRestockModal(item)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Restock
                        </button>
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Restock Inventory</h2>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Product:</p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedItem.product?.name}
                {selectedItem.product?.flavor && ` - ${selectedItem.product.flavor}`}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Current Stock: <span className="font-semibold">{selectedItem.quantity}</span>
              </p>
            </div>

            <form onSubmit={handleRestock}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockForm.quantity}
                  onChange={(e) =>
                    setRestockForm({ ...restockForm, quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={restockForm.notes}
                  onChange={(e) =>
                    setRestockForm({ ...restockForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Supplier name, batch number..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  <Plus className="h-5 w-5" />
                  {submitting ? 'Restocking...' : 'Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Product:</p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedItem.product?.name}
                {selectedItem.product?.flavor && ` - ${selectedItem.product.flavor}`}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Current Stock: <span className="font-semibold">{selectedItem.quantity}</span>
              </p>
            </div>

            <form onSubmit={handleAdjust}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity Change *
                </label>
                <input
                  type="number"
                  value={adjustForm.quantityChange}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, quantityChange: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 50 (add) or -10 (reduce)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers to increase, negative to decrease
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Adjustment *
                </label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Damaged items, stock count correction..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  <Edit className="h-5 w-5" />
                  {submitting ? 'Adjusting...' : 'Adjust Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
