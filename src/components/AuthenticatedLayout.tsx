'use client';

import Navigation from './Navigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
