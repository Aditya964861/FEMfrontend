import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Eye, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OutstandingSignatures() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment-instructions-outstanding'],
    queryFn: async () => {
      // Fetch instructions that are awaiting signatures
      const [sent, viewed, pending, signed] = await Promise.all([
        paymentApi.list({ status: 'sent', page_size: 100 }),
        paymentApi.list({ status: 'viewed', page_size: 100 }),
        paymentApi.list({ status: 'pending_signature', page_size: 100 }),
        paymentApi.list({ status: 'signed', page_size: 100 }),
      ]);
      return [
        ...(sent.items || []),
        ...(viewed.items || []),
        ...(pending.items || []),
        ...(signed.items || []).filter((i: { signed_pdf_filename?: string }) => !i.signed_pdf_filename),
      ];
    },
  });

  const pollAll = useMutation({
    mutationFn: () => paymentApi.pollOutstanding(),
    onSuccess: (result) => {
      const msg = `Checked ${result.checked} PI(s) — ${result.status_changed} updated, ${result.auto_processed} auto-processed`;
      if (result.auto_processed > 0) {
        toast.success(msg);
      } else {
        toast.success(msg);
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['payment-instructions-completed'] });
    },
    onError: () => toast.error('Poll failed'),
  });

  const items = data || [];

  return (
    <div>
      {/* Header */}

      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className='heading'>
          <h1>Outstanding Signatures</h1>
          <p>
            {items.length} instruction{items.length !== 1 ? 's' : ''} awaiting signature
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => pollAll.mutate()}
            disabled={pollAll.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className={`w-4 h-4 ${pollAll.isPending ? 'animate-pulse' : ''}`} />
            {pollAll.isPending ? 'Polling...' : 'Poll DocuSign'}
          </button>
          <button
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
        {isLoading ? (
          <LoadingSpinner />
        ) : !items.length ? (

          <div className="text-center py-12 text-gray-500">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No outstanding signatures</p>
            <p className="text-sm mt-1">All payment instructions have been signed.</p>
          </div>

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[#D2E1E9]">
              <thead>
                <tr className="text-left border-b border-gray-200 bg-[#EFF5FB]">
                  <th className="p-2 pl-4 font-medium text-[#5D6B74]">Invoice #</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Paying Entity</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Beneficiary</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Amount</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Sent To</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Sent Date</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Status</th>
                  <th className="p-2 font-medium text-[#5D6B74] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[#D2E1E9]">
                    <td className="p-2 pl-4 font-normal text-[#475259]">
                      {item.invoice_number}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {item.paying_entity?.entity_name ?? '—'}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {item.beneficiary?.name ?? '—'}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {item.currency?.symbol ?? item.currency?.code ?? ''}
                      {item.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {item.docusign_recipient_email ?? '—'}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {item.docusign_sent_at
                        ? new Date(item.docusign_sent_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-2 font-normal text-[#475259] text-center">
                      <Link
                        to={`/payment-instructions/${item.id}`}
                        className="p-1.5 px-2 text-primary-600 bg-primary-50 rounded transition-colors hover:bg-primary-100 inline-flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
