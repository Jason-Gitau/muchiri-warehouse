'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Filter,
  Package,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  flavor: string;
  category: string;
  sku: string;
  unitPrice: number;
  imageUrl?: string;
  warehouseInventory?: Array<{ quantity: number }>;
}

export default function WarehouseProductsPage() {
  const router = useRouter();
  const { cart, addToCart, getTotalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Temporary cart quantities for UI
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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

      if (userData?.role !== 'DISTRIBUTOR') {
        router.push('/dashboard');
        return;
      }

      await fetchProducts();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);

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
          product.flavor.toLowerCase().includes(searchLower) ||
          product.category.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const getAvailableQuantity = (product: Product) => {
    return product.warehouseInventory?.[0]?.quantity || 0;
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const newValue = Math.max(1, current + delta);
      return { ...prev, [productId]: newValue };
    });
  };

  const handleAddToCart = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    const availableQuantity = getAvailableQuantity(product);

    if (availableQuantity <= 0) {
      alert('This product is out of stock');
      return;
    }

    if (quantity > availableQuantity) {
      alert(`Only ${availableQuantity} units available`);
      return;
    }

    addToCart(
      {
        productId: product.id,
        name: product.name,
        flavor: product.flavor,
        unitPrice: Number(product.unitPrice),
        availableQuantity,
      },
      quantity
    );

    // Reset quantity
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));

    // Show success message
    alert(`Added ${quantity} x ${product.name} to cart`);
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
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Cart Button */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order from Warehouse</h1>
          <p className="text-gray-600 mt-2">
            Browse available products and place your order
          </p>
        </div>
        <button
          onClick={() => router.push('/checkout')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-lg"
        >
          <ShoppingCart className="h-5 w-5" />
          Cart ({getTotalItems()})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
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
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const availableQty = getAvailableQuantity(product);
            const currentQty = quantities[product.id] || 1;
            const isOutOfStock = availableQty <= 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.flavor} • {product.category}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Available:</span>
                      <span
                        className={`font-semibold ${
                          isOutOfStock ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {availableQty} units
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(Number(product.unitPrice))}
                    </div>
                  </div>

                  {!isOutOfStock && (
                    <div className="space-y-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          disabled={currentQty <= 1}
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="font-semibold text-gray-900 px-4">
                          {currentQty}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          disabled={currentQty >= availableQty}
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium"
                      >
                        <ShoppingBag className="h-5 w-5" />
                        Add to Cart
                      </button>
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 py-3 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Out of Stock</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
