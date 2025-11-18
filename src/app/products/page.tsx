'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  DollarSign,
  Tag,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  flavor: string;
  category: string;
  sku: string;
  unitPrice: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  warehouseInventory?: Array<{ quantity: number }>;
  availableQuantity?: number;
}

interface ProductForm {
  name: string;
  flavor: string;
  category: string;
  sku: string;
  unitPrice: string;
  initialStock: string;
  reorderLevel: string;
  imageUrl: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState<ProductForm>({
    name: '',
    flavor: '',
    category: '',
    sku: '',
    unitPrice: '',
    initialStock: '',
    reorderLevel: '50',
    imageUrl: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    flavor: '',
    category: '',
    unitPrice: '',
    imageUrl: '',
  });

  useEffect(() => {
    checkAuthAndFetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, categoryFilter]);

  const checkAuthAndFetchProducts = async () => {
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
      await fetchProducts(userData?.role);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchProducts = async (role?: string) => {
    try {
      setLoading(true);

      // Clients see products from their distributor's inventory
      if (role === 'CLIENT') {
        const response = await fetch('/api/products/available');
        const data = await response.json();

        if (response.ok) {
          setProducts(data.products || []);
        }
      } else {
        // Managers, Distributors, Owners see all products
        const response = await fetch('/api/products');
        const data = await response.json();

        if (response.ok) {
          setProducts(data.products || []);

          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(data.products.map((p: Product) => p.category).filter(Boolean))
          ) as string[];
          setCategories(uniqueCategories);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower) ||
          product.flavor.toLowerCase().includes(searchLower) ||
          product.category.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const unitPrice = parseFloat(addForm.unitPrice);
    const initialStock = parseInt(addForm.initialStock);
    const reorderLevel = parseInt(addForm.reorderLevel);

    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert('Please enter a valid unit price');
      return;
    }

    if (isNaN(initialStock) || initialStock < 0) {
      alert('Please enter a valid initial stock quantity');
      return;
    }

    if (isNaN(reorderLevel) || reorderLevel < 0) {
      alert('Please enter a valid reorder level');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          flavor: addForm.flavor,
          category: addForm.category,
          sku: addForm.sku,
          unitPrice,
          initialStock,
          reorderLevel,
          imageUrl: addForm.imageUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Product added successfully!');
        setShowAddModal(false);
        setAddForm({
          name: '',
          flavor: '',
          category: '',
          sku: '',
          unitPrice: '',
          initialStock: '',
          reorderLevel: '50',
          imageUrl: '',
        });
        await fetchProducts(userRole || undefined);
      } else {
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const unitPrice = parseFloat(editForm.unitPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      alert('Please enter a valid unit price');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          flavor: editForm.flavor,
          category: editForm.category,
          unitPrice,
          imageUrl: editForm.imageUrl || '',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Product updated successfully!');
        setShowEditModal(false);
        setSelectedProduct(null);
        await fetchProducts(userRole || undefined);
      } else {
        alert(data.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateProduct = async (product: Product) => {
    if (
      !confirm(
        `Are you sure you want to deactivate "${product.name}"? It will be hidden from distributors and clients.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Product deactivated successfully!');
        await fetchProducts(userRole || undefined);
      } else {
        alert(data.error || 'Failed to deactivate product');
      }
    } catch (error) {
      console.error('Error deactivating product:', error);
      alert('Failed to deactivate product');
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      flavor: product.flavor,
      category: product.category,
      unitPrice: product.unitPrice.toString(),
      imageUrl: product.imageUrl || '',
    });
    setShowEditModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const canManageProducts = userRole === 'MANAGER' || userRole === 'OWNER';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'MANAGER' && 'Manage your product catalog'}
            {userRole === 'DISTRIBUTOR' && 'Browse available warehouse products'}
            {userRole === 'CLIENT' && 'Browse available products'}
            {userRole === 'OWNER' && 'View product catalog'}
          </p>
        </div>
        {canManageProducts && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{products.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Categories</p>
              <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Tag className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Price</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.length > 0
                  ? formatCurrency(
                      products.reduce((sum, p) => sum + p.unitPrice, 0) /
                        products.length
                    )
                  : 'KSh 0'}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, flavor, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
            {canManageProducts && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first product
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.flavor} • {product.category}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                  </div>
                  {canManageProducts && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit product"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeactivateProduct(product)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Deactivate product"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {product.warehouseInventory &&
                  product.warehouseInventory.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        Stock:{' '}
                        <span className="font-semibold">
                          {product.warehouseInventory[0].quantity} units
                        </span>
                      </p>
                    </div>
                  )}

                {userRole === 'CLIENT' && product.availableQuantity !== undefined && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">
                      Available:{' '}
                      <span className="font-semibold">
                        {product.availableQuantity} units
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(product.unitPrice)}
                  </span>
                  {(userRole === 'DISTRIBUTOR' || userRole === 'CLIENT') && (
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flavor *
                  </label>
                  <input
                    type="text"
                    value={addForm.flavor}
                    onChange={(e) =>
                      setAddForm({ ...addForm, flavor: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm({ ...addForm, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Beverages, Snacks"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., SODA-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price (KSh) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.unitPrice}
                    onChange={(e) =>
                      setAddForm({ ...addForm, unitPrice: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.initialStock}
                    onChange={(e) =>
                      setAddForm({ ...addForm, initialStock: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.reorderLevel}
                    onChange={(e) =>
                      setAddForm({ ...addForm, reorderLevel: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={addForm.imageUrl}
                    onChange={(e) =>
                      setAddForm({ ...addForm, imageUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  <Plus className="h-5 w-5" />
                  {submitting ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditProduct}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flavor *
                  </label>
                  <input
                    type="text"
                    value={editForm.flavor}
                    onChange={(e) =>
                      setEditForm({ ...editForm, flavor: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price (KSh) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.unitPrice}
                    onChange={(e) =>
                      setEditForm({ ...editForm, unitPrice: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editForm.imageUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, imageUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Note: SKU cannot be changed. Price changes won't affect existing
                orders.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  <Edit className="h-5 w-5" />
                  {submitting ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
