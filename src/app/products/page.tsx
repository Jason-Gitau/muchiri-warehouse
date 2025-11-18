'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProductsPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRoleAndProducts();
  }, []);

  const fetchUserRoleAndProducts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: userData } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;
      setUserRole(role);

      // Clients see products from their distributor's inventory
      if (role === 'CLIENT') {
        const response = await fetch('/api/products/available');
        const data = await response.json();

        if (response.ok) {
          setProducts(data.products || []);
        } else {
          console.error('Error fetching available products:', data.error);
          setProducts([]);
        }
      } else {
        // Managers, Distributors, Owners see all products
        const { data: productsData } = await supabase
          .from('Product')
          .select('*');

        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-2">
          {userRole === 'MANAGER' && 'Manage your product catalog'}
          {userRole === 'DISTRIBUTOR' && 'Browse available warehouse products'}
          {userRole === 'CLIENT' && 'Browse available products'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          products.map((product: any) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {product.flavor} • {product.category}
                </p>
                {userRole === 'CLIENT' && product.availableQuantity !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    Available: {product.availableQuantity} units
                  </p>
                )}
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    KSh {product.unitPrice || product.price}
                  </span>
                  {(userRole === 'DISTRIBUTOR' || userRole === 'CLIENT') && (
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
