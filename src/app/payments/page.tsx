'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  DollarSign,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  CreditCard,
  FileText,
  Phone,
} from 'lucide-react';

interface Payment {
  id: string;
  orderNumber: string;
  orderType: 'WAREHOUSE_TO_DISTRIBUTOR' | 'DISTRIBUTOR_TO_CLIENT';
  distributorId?: string;
  distributorName: string;
  clientName?: string;
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  paymentNotes?: string;
  createdAt: string;
  paidAt?: string;
  mpesaPhoneNumber?: string;
  mpesaTransactionId?: string;
  mpesaReceiptNumber?: string;
}

interface Distributor {
  id: string;
  businessName: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [distributorFilter, setDistributorFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Mark as paid modal
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentMethod: 'Cash',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, statusFilter, distributorFilter, paymentTypeFilter]);

  const checkAuthAndFetchData = async () => {
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

      if (!userData || (userData.role !== 'MANAGER' && userData.role !== 'OWNER')) {
        router.push('/dashboard');
        return;
      }

      setUserRole(userData.role);
      await fetchPayments();
      await fetchDistributors();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('paymentStatus', statusFilter);
      if (distributorFilter !== 'all') params.append('distributorId', distributorFilter);
      if (paymentTypeFilter !== 'all') params.append('paymentType', paymentTypeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/payments?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setPayments(data.payments || []);
      } else {
        console.error('Failed to fetch payments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await fetch('/api/distributors');
      const data = await response.json();

      if (response.ok) {
        setDistributors(data.distributors || []);
      }
    } catch (error) {
      console.error('Error fetching distributors:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Search filter (order number, distributor name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.orderNumber.toLowerCase().includes(searchLower) ||
          payment.distributorName.toLowerCase().includes(searchLower) ||
          (payment.clientName && payment.clientName.toLowerCase().includes(searchLower))
      );
    }

    setFilteredPayments(filtered);
  };

  const openMarkPaidModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setMarkPaidForm({ paymentMethod: 'Cash', notes: '' });
    setShowMarkPaidModal(true);
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/payments/${selectedPayment.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(markPaidForm),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Payment marked as paid successfully!');
        setShowMarkPaidModal(false);
        setSelectedPayment(null);
        await fetchPayments();
      } else {
        alert(data.error || 'Failed to mark payment as paid');
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Failed to mark payment as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      PAID: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      UNPAID: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Unpaid' },
      FAILED: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Failed' },
    };

    const config = statusConfig[status] || statusConfig.UNPAID;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  const stats = {
    totalPayments: payments.length,
    paidPayments: payments.filter((p) => p.paymentStatus === 'PAID').length,
    pendingPayments: payments.filter((p) => p.paymentStatus === 'PENDING').length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paidAmount: payments
      .filter((p) => p.paymentStatus === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
        <p className="text-gray-600 mt-2">
          Monitor and verify all payments across warehouse and client orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Payments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Paid</p>
              <p className="text-3xl font-bold text-green-600">{stats.paidPayments}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayments}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paidAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">of {formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search order, distributor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Payment Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchPayments();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="UNPAID">Unpaid</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Payment Type */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => {
              setPaymentTypeFilter(e.target.value);
              fetchPayments();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="warehouse">Warehouse Orders</option>
            <option value="client">Client Orders</option>
          </select>

          {/* Distributor */}
          <select
            value={distributorFilter}
            onChange={(e) => {
              setDistributorFilter(e.target.value);
              fetchPayments();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Distributors</option>
            {distributors.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.businessName}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value) fetchPayments();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start date"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distributor/Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No payments found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{payment.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {payment.orderType === 'WAREHOUSE_TO_DISTRIBUTOR'
                          ? 'Warehouse'
                          : 'Client'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {payment.distributorName}
                        </div>
                        {payment.clientName && (
                          <div className="text-gray-500 text-xs">→ {payment.clientName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <CreditCard className="h-4 w-4" />
                        {payment.paymentMethod}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(payment.createdAt)}
                      </div>
                      {payment.paidAt && (
                        <div className="text-xs text-green-600">
                          Paid: {formatDate(payment.paidAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        {payment.mpesaPhoneNumber && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="h-3 w-3" />
                            {payment.mpesaPhoneNumber}
                          </div>
                        )}
                        {payment.mpesaTransactionId && (
                          <div className="text-xs text-gray-500">
                            TxID: {payment.mpesaTransactionId}
                          </div>
                        )}
                        {payment.mpesaReceiptNumber && (
                          <div className="text-xs text-gray-500">
                            Receipt: {payment.mpesaReceiptNumber}
                          </div>
                        )}
                        {payment.paymentNotes && (
                          <div className="flex items-start gap-1 text-xs text-gray-500 max-w-xs">
                            <FileText className="h-3 w-3 mt-0.5" />
                            {payment.paymentNotes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.paymentStatus !== 'PAID' &&
                        payment.orderType === 'WAREHOUSE_TO_DISTRIBUTOR' && (
                          <button
                            onClick={() => openMarkPaidModal(payment)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Mark as Paid
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mark Payment as Paid</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="font-semibold text-gray-900">{selectedPayment.orderNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Amount</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(Number(selectedPayment.amount))}
              </p>
            </div>

            <form onSubmit={handleMarkAsPaid}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={markPaidForm.paymentMethod}
                  onChange={(e) =>
                    setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={markPaidForm.notes}
                  onChange={(e) =>
                    setMarkPaidForm({ ...markPaidForm, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any additional payment details..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
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
                  <CheckCircle className="h-5 w-5" />
                  {submitting ? 'Marking...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
