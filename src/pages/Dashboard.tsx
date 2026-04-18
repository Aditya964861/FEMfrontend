import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  AlertTriangle,
  FileEdit,
  CheckSquare,
  FolderOpen,
  Clock4,
} from 'lucide-react';
import { paymentApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-instructions', { page: 1, page_size: 100 }],
    queryFn: () => paymentApi.list({ page: 1, page_size: 100 }),
  });

  if (isLoading) return <LoadingSpinner />;

  const items = data?.items || [];
  const totalCount = data?.total || 0;

  const drafts = items.filter((i) => i.status === 'draft').length;
  const sent = items.filter((i) => i.status === 'sent' || i.status === 'viewed').length;
  const signed = items.filter((i) => i.status === 'signed').length;
  const completed = items.filter((i) => i.status === 'completed').length;

  const stats = [
    {
      label: 'Total Instructions',
      value: totalCount,
      icon: FileText,
      color: 'bg-primary-50 text-primary-800',
      iconColor: 'text-[#4CA4CB]',
    },
    {
      label: 'Drafts',
      value: drafts,
      icon: FolderOpen,
      color: 'bg-gray-50 text-gray-700',
      iconColor: 'text-[#8489E9]',
    },
    {
      label: 'Awaiting Signature',
      value: sent,
      icon: Clock4,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-[#52CA7F]',
    },
    {
      label: 'Signed',
      value: signed,
      icon: FileEdit,
      color: 'bg-emerald-50 text-emerald-700',
      iconColor: 'text-[#E5C164]',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckSquare,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-[#F6A4A4]',
    },
  ];

  const recent = items.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className='heading'>
          <h1>Dashboard</h1>
          <p>Payment instruction overview</p>
        </div>
        <Link to="/payment-instructions/new" className="btn-primary flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          New Instruction
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 xl:gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card gap-4 dashboard-card-component border-0 rounded-none shadow-none p-2 sm:p-4 xl:p-6">
            <div className={`2xl:w-10 2xl:h-10 xl:w-8 xl:h-8 h-7 w-7 2xl:mb-5 xl:mb-4 md:mb-3 mb-2 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className={`2xl:w-5 2xl:h-5 w-4 h-4 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-black">{stat.label}</p>
              <p className="2xl:text-4xl xl:text-2xl text-xl text-black font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Items */}
      <div className="flex items-center justify-between bg-[#326382] p-4 py-2 rounded-t-lg">
        <div className='heading'>
          <h2 className='text-white'>Recent Payment Instructions</h2>
        </div>
        <Link to="/payment-instructions" className="btn-primary flex items-center gap-2 text-sm px-6">
          View all
        </Link>
      </div>

      <div className="rounded-b-lg bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">
        {recent.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No payment instructions yet.</p>
            <Link to="/payment-instructions/new" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
              Create your first one →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[#D2E1E9]">
              <thead>
                <tr className="text-left border-b border-gray-200 bg-[#EFF5FB]">
                  <th className="p-2 pl-4 font-medium text-[#5D6B74]">Invoice #</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Paying Entity</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Amount</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Status</th>
                  <th className="p-2 font-medium text-[#5D6B74]">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((pi) => (
                  <tr key={pi.id} className="border-t border-[#D2E1E9]">
                    <td className="p-2 font-normal text-[#475259] pl-4">
                      <Link
                        to={`/payment-instructions/${pi.id}`}
                        className="text-primary-600 hover:underline font-medium"
                      >
                        {pi.invoice_number}
                      </Link>
                    </td>
                    <td className="p-2 font-normal text-[#475259]">{pi.paying_entity?.entity_name || '—'}</td>
                    <td className="p-2 font-normal text-[#475259]">
                      {pi.currency?.symbol}
                      {pi.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          pi.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : pi.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : pi.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {pi.status}
                      </span>
                    </td>
                    <td className="p-2 font-normal text-[#475259]">
                      {new Date(pi.created_at).toLocaleDateString()}
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
