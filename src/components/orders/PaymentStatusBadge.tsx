import { PaymentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const statusStyles = {
    UNPAID: 'bg-gray-100 text-gray-800 border-gray-300',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    PAID: 'bg-green-100 text-green-800 border-green-300',
    FAILED: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusLabels = {
    UNPAID: 'Unpaid',
    PENDING: 'Payment Pending',
    PAID: 'Paid',
    FAILED: 'Payment Failed',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
