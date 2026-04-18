import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye } from 'lucide-react';
import { paymentApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CompletedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-instructions-completed'],
    queryFn: () => paymentApi.list({ status: 'completed', page_size: 100 }),
  });

  const items = data?.items || [];

  return (
    <div>
      {/* Header */}

      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className='heading'>
          <h1>Completed</h1>
          <p>
            {items.length} completed payment instruction{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
        {isLoading ? (
          <LoadingSpinner />
        ) : !items.length ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No completed instructions yet</p>
            <p className="text-sm mt-1">
              Instructions will appear here once they are fully signed and processed.
            </p>
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
                  <th className="p-2 font-medium text-[#5D6B74]">Completed Date</th>
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
                      {item.docusign_signed_at
                        ? new Date(item.docusign_signed_at).toLocaleDateString()
                        : item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString()
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
