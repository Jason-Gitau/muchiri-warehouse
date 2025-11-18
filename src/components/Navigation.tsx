'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Store,
  ShoppingBag,
  ClipboardList,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
}

const navigationItems: NavItem[] = [
  // Owner Navigation
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['OWNER', 'MANAGER', 'DISTRIBUTOR', 'CLIENT'],
  },
  {
    name: 'Analytics',
    href: '/owner-dashboard',
    icon: TrendingUp,
    roles: ['OWNER', 'MANAGER'],
  },

  // Manager Navigation
  {
    name: 'Products',
    href: '/products',
    icon: Package,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Warehouse,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    name: 'Warehouse Orders',
    href: '/warehouse-orders',
    icon: ShoppingCart,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    name: 'Distributors',
    href: '/distributors',
    icon: Users,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: DollarSign,
    roles: ['OWNER', 'MANAGER'],
  },

  // Distributor Navigation
  {
    name: 'Shop Warehouse',
    href: '/warehouse-products',
    icon: Store,
    roles: ['DISTRIBUTOR'],
  },
  {
    name: 'My Inventory',
    href: '/distributor-inventory',
    icon: Warehouse,
    roles: ['DISTRIBUTOR'],
  },
  {
    name: 'My Orders',
    href: '/distributor-orders',
    icon: ShoppingCart,
    roles: ['DISTRIBUTOR'],
  },
  {
    name: 'My Clients',
    href: '/clients',
    icon: Users,
    roles: ['DISTRIBUTOR'],
  },
  {
    name: 'Client Orders',
    href: '/client-orders',
    icon: ClipboardList,
    roles: ['DISTRIBUTOR'],
  },

  // Client Navigation
  {
    name: 'Shop',
    href: '/shop',
    icon: ShoppingBag,
    roles: ['CLIENT'],
  },
  {
    name: 'My Orders',
    href: '/my-orders',
    icon: FileText,
    roles: ['CLIENT'],
  },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch user details from database
        const response = await fetch('/api/users/me');
        const data = await response.json();

        if (data.user) {
          setUserRole(data.user.role);
          setUserName(data.user.fullName || data.user.email);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredNavItems = navigationItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  );

  if (loading) {
    return null;
  }

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/auth') || pathname === '/') {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-gray-900" />
        ) : (
          <Menu className="h-6 w-6 text-gray-900" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              Warehouse System
            </h1>
            <p className="text-sm text-gray-600 mt-1">{userRole} Portal</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-600">{userRole}</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
