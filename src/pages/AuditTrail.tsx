/**
 * AuditTrail — Global audit log viewer
 *
 * Unified view of all PI and Beneficiary audit events with
 * type filtering, search, and pagination.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  // Clock,
  Search,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  // ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { auditApi } from '../services/api';
import type { UnifiedAuditLog } from '../types';

const PAGE_SIZE = 25;

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'pi', label: 'Payment Instructions' },
  { key: 'beneficiary', label: 'Beneficiaries' },
] as const;

/** Colour-code actions for quick scanning. */
function actionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('created') || lower.includes('create'))
    return 'bg-emerald-100 text-emerald-700';
  if (lower.includes('approved') || lower.includes('approve'))
    return 'bg-green-100 text-green-700';
  if (lower.includes('rejected') || lower.includes('reject'))
    return 'bg-red-100 text-red-700';
  if (lower.includes('updated') || lower.includes('update') || lower.includes('edit'))
    return 'bg-blue-100 text-blue-700';
  if (lower.includes('signed') || lower.includes('signature'))
    return 'bg-purple-100 text-purple-700';
  if (lower.includes('uploaded') || lower.includes('upload'))
    return 'bg-indigo-100 text-indigo-700';
  if (lower.includes('deleted') || lower.includes('delete'))
    return 'bg-red-100 text-red-700';
  if (lower.includes('sent') || lower.includes('send'))
    return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

function typeBadge(logType: string) {
  return logType === 'pi'
    ? 'bg-blue-50 text-blue-600 border-blue-200'
    : 'bg-amber-50 text-amber-600 border-amber-200';
}

export default function AuditTrail() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [logType, setLogType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__auditSearchTimer);
    (window as any).__auditSearchTimer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', page, logType, debouncedSearch],
    queryFn: () =>
      auditApi.list({
        page,
        page_size: PAGE_SIZE,
        log_type: logType || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  /** Navigate to the related entity detail page. */
  function goToRelated(log: UnifiedAuditLog) {
    if (log.log_type === 'pi' && log.payment_instruction_id) {
      navigate(`/payment-instructions/${log.payment_instruction_id}`);
    } else if (log.log_type === 'beneficiary') {
      navigate('/beneficiaries');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className='heading'>
          <h1>Audit Trail</h1>
          <p>
            Complete activity log across all payment instructions and beneficiaries
          </p>
        </div>
        <span className="text-sm text-gray-400">{total} entries</span>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg p-4 bg-white mb-6 flex flex-col sm:flex-row gap-4">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions, details, users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input-field pl-9 rounded focus:ring-0 focus:outline-none"
          />
        </div>

          {/* Type tabs */}
          <div className="flex gap-2 flex-wrap">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setLogType(tab.key); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 min-w-[50px] rounded text-xs font-medium transition-colors',
                  logType === tab.key
                    ? 'bg-[#D3F263] border border-[#D3F263] focus:ring-0 outline-0'
                    : 'bg-white border border-[#D2E1E9] hover:bg-[#D3F263] outline-0 focus:ring-0',
                )}
              >
                {/* <tab.icon className="w-4 h-4" /> */}
                {tab.label}
              </button>
            ))}
          </div>

      </div>

      {/* Results */}
      {isLoading ? (
        <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
          <div className='text-center py-12 text-gray-500'>
            Loading audit logs...
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
          <div className='text-center py-12 text-gray-500'>
            Failed to load audit logs.
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
          <div className='text-center py-12 text-gray-500'>
            <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No audit entries match your filters.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)] border border-[#D2E1E9] overflow-x-auto">
          <table className="w-full text-sm ">
            <thead>
              <tr className="text-left border-b border-gray-200 bg-[#EFF5FB]">
                <th className="p-2 pl-4 font-medium text-[#5D6B74] rounded-tl-lg">Timestamp</th>
                <th className="p-2 pl-4 font-medium text-[#5D6B74]">Type</th>
                <th className="p-2 pl-4 font-medium text-[#5D6B74]">Action</th>
                <th className="p-2 pl-4 font-medium text-[#5D6B74]">Detail</th>
                <th className="p-2 pl-4 font-medium text-[#5D6B74]">Performed By</th>
                <th className="p-2 pl-4 font-medium text-[#5D6B74] text-center rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-[#D2E1E9]"
                  onClick={() => goToRelated(log)}
                >
                  <td className="p-2 pl-4 font-normal text-[#475259] text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 pl-4 font-normal text-[#475259]">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                        typeBadge(log.log_type),
                      )}
                    >
                      {log.log_type === 'pi' ? (
                        <><FileText className="w-3 h-3" /> PI</>
                      ) : (
                        <><UserCheck className="w-3 h-3" /> Beneficiary</>
                      )}
                    </span>
                  </td>
                  <td className="p-2 pl-4 font-normal text-[#475259] text-xs">
                    <span
                      className={clsx(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                        actionBadge(log.action),
                      )}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2 pl-4 font-normal text-[#475259] max-w-sm truncate text-xs">
                    {log.detail || '—'}
                  </td>
                  <td className="p-2 pl-4 font-normal text-[#475259] max-w-sm truncate text-xs">
                    {log.performed_by}
                  </td>
                  <td className="p-2 pl-4 font-normal text-[#475259] text-xs cursor-pointer">
                    <ExternalLink className="w-4 h-4 hover:text-green-600 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
