'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Mail, Phone, Plus, Trash2, TrendingUp, ShoppingCart } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Distributor {
  id: string;
  userId: string;
  businessName: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  user: {
    email: string;
    fullName: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    clientCount: number;
  };
}

export default function DistributorsPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    businessName: '',
    phoneNumber: '',
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchUserRoleAndDistributors();
  }, []);

  const fetchUserRoleAndDistributors = async () => {
    try {
      setLoading(true);

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

      // Only managers and owners can view distributors
      if (role !== 'MANAGER' && role !== 'OWNER') {
        window.location.href = '/dashboard';
        return;
      }

      // Fetch distributors via API
      const response = await fetch('/api/distributors');
      const data = await response.json();

      if (response.ok) {
        setDistributors(data.distributors || []);
      }
    } catch (error) {
      console.error('Error fetching distributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const response = await fetch('/api/distributors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Distributor invited successfully! They will receive an email with login instructions.');
        setShowInviteModal(false);
        setInviteForm({
          email: '',
          businessName: '',
          phoneNumber: '',
        });
        // Refresh distributors list
        fetchUserRoleAndDistributors();
      } else {
        alert(data.error || 'Failed to invite distributor');
      }
    } catch (error) {
      console.error('Error inviting distributor:', error);
      alert('Failed to invite distributor');
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivateDistributor = async (distributorId: string) => {
    if (!confirm('Are you sure you want to deactivate this distributor? Their clients will need to be reassigned.')) {
      return;
    }

    try {
      const response = await fetch('/api/distributors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributorId }),
      });

      if (response.ok) {
        alert('Distributor deactivated successfully');
        // Refresh distributors list
        fetchUserRoleAndDistributors();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deactivate distributor');
      }
    } catch (error) {
      console.error('Error deactivating distributor:', error);
      alert('Failed to deactivate distributor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading distributors...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Distributors</h1>
          <p className="text-gray-600 mt-2">
            Manage your distributor network and performance
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Invite Distributor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Distributors</p>
              <p className="text-3xl font-bold text-gray-900">{distributors.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">
                {distributors.reduce((sum, d) => sum + d.stats.totalOrders, 0)}
              </p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                KSh {distributors.reduce((sum, d) => sum + d.stats.totalSpent, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">
                {distributors.reduce((sum, d) => sum + d.stats.clientCount, 0)}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Distributors List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {distributors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No distributors yet</p>
            <p className="text-gray-400 mb-4">
              Invite distributors to expand your network
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Invite Your First Distributor
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distributor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {distributors.map((distributor) => (
                <tr key={distributor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {distributor.user.fullName}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {distributor.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {distributor.businessName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {distributor.phoneNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {distributor.stats.totalOrders}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      KSh {distributor.stats.totalSpent.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {distributor.stats.clientCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(distributor.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeactivateDistributor(distributor.id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Invite New Distributor
            </h2>
            <form onSubmit={handleInviteDistributor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="distributor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.businessName}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, businessName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XYZ Distributors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={inviteForm.phoneNumber}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, phoneNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+254 700 000 000"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
