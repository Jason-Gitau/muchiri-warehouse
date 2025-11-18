'use client';

import { CartProvider } from '@/contexts/CartContext';
import Navigation from '@/components/Navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="lg:pl-64">
          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </CartProvider>
  );
}
