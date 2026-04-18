import type { PaymentStatus } from '../types';
import { clsx } from 'clsx';

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  pending_signature: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800' },
  viewed: { label: 'Viewed', className: 'bg-yellow-100 text-yellow-800' },
  signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-800' },
  voided: { label: 'Voided', className: 'bg-gray-200 text-gray-600' },
};

interface StatusBadgeProps {
  status: PaymentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
