'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InventoryPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRoleAndInventory();
  }, []);

  const fetchUserRoleAndInventory = async () => {
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

      setUserRole(userData?.role);

      // Fetch inventory
      if (userData?.role === 'MANAGER') {
        const { data: inventoryData } = await supabase
          .from('WarehouseInventory')
          .select('*');
        setInventory(inventoryData || []);
      } else if (userData?.role === 'DISTRIBUTOR') {
        const { data: inventoryData } = await supabase
          .from('DistributorInventory')
          .select('*');
        setInventory(inventoryData || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-600 mt-2">
          {userRole === 'MANAGER' && 'Manage warehouse inventory'}
          {userRole === 'DISTRIBUTOR' && 'View your inventory'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No inventory found
                </td>
              </tr>
            ) : (
              inventory.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.productId || item.product?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
