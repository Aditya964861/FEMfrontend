import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, FileText, Pencil, Send, Trash2, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import type { PaymentStatus } from '../types';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'signed', label: 'Signed' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'voided', label: 'Voided' },
];

export default function PaymentInstructionList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; invoice: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payment-instructions', { page, search, status: statusFilter }],
    queryFn: () =>
      paymentApi.list({
        page,
        page_size: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentApi.delete(id, reason),
    onSuccess: () => {
      toast.success('Payment instruction deleted');
      setDeleteTarget(null);
      setDeleteReason('');
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Delete failed');
    },
  });

  const processAllSigned = useMutation({
    mutationFn: () => paymentApi.processAllSigned(),
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.success(`Processed ${result.succeeded} of ${result.total} signed documents (${result.failed} failed)`);
      } else {
        toast.success(`Processed ${result.succeeded} signed document${result.succeeded !== 1 ? 's' : ''} successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
    },
    onError: () => toast.error('Batch processing failed'),
  });

  const canDelete = (status: string) =>
    !['sent', 'viewed', 'signed', 'completed'].includes(status);

  const canSendForSignature = (status: string, hasPdf: boolean) =>
    ['pending_signature', 'declined', 'voided'].includes(status) && hasPdf;

  return (
    <div>
      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Payment Instruction</h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete PI for invoice <span className="font-semibold">{deleteTarget.invoice}</span>?
              The original invoice will be restored to SharePoint.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Reason for deletion <span className="text-red-500">*</span>
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="e.g. Duplicate entry, wrong invoice attached…"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!deleteReason.trim() || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason.trim() })}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className='heading'>
          <h1>Payment Instructions</h1>
          <p>
            {data?.total ?? 0} total instructions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.items?.some((pi) => pi.status === 'signed') && (
            <button
              onClick={() => processAllSigned.mutate()}
              disabled={processAllSigned.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-dark bg-brand-lime rounded-lg hover:bg-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              {processAllSigned.isPending ? 'Processing...' : 'Process All Signed'}
            </button>
          )}
          <Link
            to="/payment-instructions/new"
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            New Instruction
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg mb-6 p-4 bg-white ">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative border border-[#D2E1E9] rounded">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number..."
              className="input-field pl-10 border-0 focus:ring-0"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input-field w-full sm:w-48 border border-[#D2E1E9] rounded focus:ring-0"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.items?.length ? (

          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No payment instructions found</p>
            <p className="text-sm mt-1">Create your first instruction to get started.</p>
          </div>

        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-[#D2E1E9]">
                <thead>
                  <tr className="text-left border-b border-gray-200 bg-[#EFF5FB]">
                    <th className="p-2 pl-4 font-medium text-[#5D6B74]">Invoice #</th>
                    <th className="p-2 font-medium text-[#5D6B74]">Paying Entity</th>
                    <th className="p-2 font-medium text-[#5D6B74]">Beneficiary</th>
                    <th className="p-2 font-medium text-[#5D6B74]">Amount</th>
                    <th className="p-2 font-medium text-[#5D6B74]">Status</th>
                    <th className="p-2 font-medium text-[#5D6B74]">Created</th>
                    <th className="p-2 font-medium text-[#5D6B74] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((pi) => (
                    <tr
                      key={pi.id}
                      className="border-t border-[#D2E1E9]"
                    >
                      <td className="p-2 font-normal text-[#475259] pl-4">
                        <Link
                          to={`/payment-instructions/${pi.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {pi.invoice_number}
                        </Link>
                      </td>
                      <td className="p-2 font-normal text-[#475259]">{pi.paying_entity?.entity_name || '—'}</td>
                      <td className="p-2 font-normal text-[#475259]">{pi.beneficiary?.name || '—'}</td>
                      <td className="p-2 font-normal text-[#475259]">
                        {pi.currency?.symbol || ''}
                        {pi.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{' '}
                        <span className="text-gray-400">{pi.currency?.code}</span>
                      </td>
                      <td className="p-2 font-normal text-[#475259]">
                        <StatusBadge status={pi.status as PaymentStatus} />
                      </td>
                      <td className="p-2 font-normal text-[#475259]">
                        {new Date(pi.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-normal text-[#475259] text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/payment-instructions/${pi.id}`)}
                            title="Edit / View"
                            className="p-1.5 text-primary-600 bg-primary-50 rounded transition-colors hover:bg-primary-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {canSendForSignature(pi.status, !!pi.pdf_filename) && (
                            <button
                              onClick={() => navigate(`/payment-instructions/${pi.id}`)}
                              title="Send for Signature"
                              className="p-1.5 text-blue-600 bg-blue-50 rounded transition duration-colors hover:bg-blue-100"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete(pi.status) && (
                            <button
                              onClick={() => setDeleteTarget({ id: pi.id, invoice: pi.invoice_number })}
                              title="Delete"
                              className="p-1.5 text-red-600 bg-red-50 rounded transition-colors hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Page {data.page} of {data.total_pages} ({data.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary text-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn-secondary text-sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
