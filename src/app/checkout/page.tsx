'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading checkout...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-2">
          Review your order and complete payment
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Checkout page coming soon</p>
      </div>
    </div>
  );
}
