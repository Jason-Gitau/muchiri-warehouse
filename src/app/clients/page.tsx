'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Mail, Phone, MapPin, Plus, Trash2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Client {
  id: string;
  userId: string;
  distributorId: string;
  businessName: string | null;
  phoneNumber: string;
  location: string;
  addedAt: string;
  isActive: boolean;
  user: {
    email: string;
    fullName: string;
  };
}

export default function ClientsPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    businessName: '',
    phoneNumber: '',
    location: '',
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchUserRoleAndClients();
  }, []);

  const fetchUserRoleAndClients = async () => {
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

      // Only distributors and managers can view clients
      if (role !== 'DISTRIBUTOR' && role !== 'MANAGER') {
        window.location.href = '/dashboard';
        return;
      }

      // Fetch clients via API
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (response.ok) {
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const response = await fetch('/api/clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Client invited successfully! They will receive an email with login instructions.');
        setShowInviteModal(false);
        setInviteForm({
          email: '',
          businessName: '',
          phoneNumber: '',
          location: '',
        });
        // Refresh clients list
        fetchUserRoleAndClients();
      } else {
        alert(data.error || 'Failed to invite client');
      }
    } catch (error) {
      console.error('Error inviting client:', error);
      alert('Failed to invite client');
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivateClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) {
      return;
    }

    try {
      const response = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (response.ok) {
        alert('Client deactivated successfully');
        // Refresh clients list
        fetchUserRoleAndClients();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deactivate client');
      }
    } catch (error) {
      console.error('Error deactivating client:', error);
      alert('Failed to deactivate client');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
          <p className="text-gray-600 mt-2">
            Manage your client relationships and orders
          </p>
        </div>
        {userRole === 'DISTRIBUTOR' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Invite Client
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No clients yet</p>
            <p className="text-gray-400 mb-4">
              Invite clients to start managing orders
            </p>
            {userRole === 'DISTRIBUTOR' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                Invite Your First Client
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                {userRole === 'DISTRIBUTOR' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {client.user.fullName}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {client.businessName || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phoneNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {client.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(client.addedAt).toLocaleDateString()}
                    </div>
                  </td>
                  {userRole === 'DISTRIBUTOR' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeactivateClient(client.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </td>
                  )}
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
              Invite New Client
            </h2>
            <form onSubmit={handleInviteClient} className="space-y-4">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="client@example.com"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ABC Shop"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+254 700 000 000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.location}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nairobi, Kenya"
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
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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
