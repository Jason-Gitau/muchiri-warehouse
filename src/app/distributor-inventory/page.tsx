'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Package,
  TrendingDown,
  Search,
  Filter,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Box,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  distributorId: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  updatedAt: string;
  product: {
    name: string;
    flavor: string;
    category: string;
    unitPrice: number;
  };
  isLowStock?: boolean;
}

export default function DistributorInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    checkAuthAndFetchInventory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventory, searchTerm, categoryFilter, lowStockOnly]);

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

      if (!userData || userData.role !== 'DISTRIBUTOR') {
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

      const response = await fetch('/api/distributors/inventory');
      const data = await response.json();

      if (response.ok) {
        const inventoryWithFlags = (data.inventory || []).map((item: InventoryItem) => ({
          ...item,
          isLowStock: item.quantity <= item.reorderLevel,
        }));

        // Sort: low stock first, then by updated date
        inventoryWithFlags.sort((a: InventoryItem, b: InventoryItem) => {
          if (a.isLowStock && !b.isLowStock) return -1;
          if (!a.isLowStock && b.isLowStock) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setInventory(inventoryWithFlags);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(
            inventoryWithFlags
              .map((item: InventoryItem) => item.product.category)
              .filter(Boolean)
          )
        ) as string[];
        setCategories(uniqueCategories);
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
          item.product.name.toLowerCase().includes(searchLower) ||
          item.product.flavor.toLowerCase().includes(searchLower) ||
          item.product.category.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.product.category === categoryFilter);
    }

    // Low stock filter
    if (lowStockOnly) {
      filtered = filtered.filter((item) => item.isLowStock);
    }

    setFilteredInventory(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = {
    totalProducts: inventory.length,
    lowStockCount: inventory.filter((item) => item.isLowStock).length,
    totalValue: inventory.reduce(
      (sum, item) => sum + item.quantity * Number(item.product.unitPrice),
      0
    ),
    totalUnits: inventory.reduce((sum, item) => sum + item.quantity, 0),
  };

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
        <h1 className="text-3xl font-bold text-gray-900">My Inventory</h1>
        <p className="text-gray-600 mt-2">
          Track your stock levels and monitor product availability
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
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
              <p className="text-3xl font-bold text-red-600">{stats.lowStockCount}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Units</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUnits}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Box className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalValue)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, flavor, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Low Stock Filter */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              lowStockOnly
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            Low Stock Only
          </button>
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
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {inventory.length === 0
                        ? 'No inventory yet. Place an order from the warehouse to get started.'
                        : 'No items match your filters'}
                    </p>
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
                          {item.product.name}
                        </div>
                        {item.product.flavor && (
                          <div className="text-sm text-gray-500">
                            {item.product.flavor}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {item.product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.reorderLevel}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(Number(item.product.unitPrice))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.quantity * Number(item.product.unitPrice))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isLowStock ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      {stats.lowStockCount > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">
                Low Stock Alert
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                You have {stats.lowStockCount} product{stats.lowStockCount !== 1 ? 's' : ''}{' '}
                running low on stock. Consider placing an order from the warehouse to
                replenish your inventory.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
