import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  // Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  History,
  Loader2,
  X,
  UserPlus,
  Edit,
  UserRoundCheck,
  Ban,
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { beneficiaryApi } from '../services/api';
import api from '../services/api';
import { useCurrentUser } from '../contexts/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Beneficiary } from '../types';
// import { Link } from 'react-router-dom';

// ── Status Badge Helper ──────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
};

function BeneficiaryStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending_approval;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  beneficiary,
  onClose,
}: {
  beneficiary: Beneficiary;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    account_name: beneficiary.account_name || '',
    nickname: beneficiary.nickname || '',
    bank_name: beneficiary.bank_name || '',
    bic: beneficiary.bic || '',
    iban: beneficiary.iban || '',
    address: beneficiary.address || '',
    reference: beneficiary.reference || '',
  });

  const updateMut = useMutation({
    mutationFn: (body: Record<string, string>) => beneficiaryApi.update(beneficiary.id, body),
    onSuccess: () => {
      toast.success('Beneficiary updated — now under review');
      qc.invalidateQueries({ queryKey: ['all-beneficiaries'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Update failed'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="form-default-component relative bg-white p-6 rounded-lg w-full max-w-md">
        <div className="">
          <h2 className="font-semibold text-lg">Edit Beneficiary</h2>
          <button onClick={onClose} className="text-white hover:bg-[#03283F] transition-colors absolute top-3 right-3 bg-red-600 rounded-full p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="py-4 space-y-4 overflow-y-auto max-h-[80vh]">
          {[
            { key: 'account_name', label: 'Account Name', required: true },
            { key: 'nickname', label: 'Nickname', required: true },
            { key: 'bank_name', label: 'Bank Name', required: true },
            { key: 'bic', label: 'BIC / SWIFT', required: true },
            { key: 'iban', label: 'IBAN', required: true },
            { key: 'address', label: 'Address', required: false },
            { key: 'reference', label: 'Reference', required: false },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="label">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                className="input-field"
                value={(form as any)[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                required={required}
              />
            </div>
          ))}
          <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Changes will set this beneficiary to <strong>Under Review</strong> and require re-approval.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary focus:ring-0" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2 focus:ring-0" disabled={updateMut.isPending}>
              {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────
function AddModal({ onClose, onCreate }: { onClose: () => void; onCreate: (body: Record<string, any>) => void }) {
  const [form, setForm] = useState({
    account_name: '',
    nickname: '',
    bank_name: '',
    bic: '',
    iban: '',
    address: '',
    reference: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = Object.entries(form).filter(([k, v]) => !['address', 'reference'].includes(k) && !v.trim());
    if (missing.length > 0) return;
    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="form-default-component relative bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Add Beneficiary</h2>
          <button onClick={onClose} className="text-white hover:bg-[#03283F] transition-colors absolute top-3 right-3 bg-red-600 rounded-full p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {[
            { key: 'account_name', label: 'Account Name', required: true },
            { key: 'nickname', label: 'Nickname', required: true },
            { key: 'bank_name', label: 'Bank Name', required: true },
            { key: 'bic', label: 'BIC / SWIFT', required: true },
            { key: 'iban', label: 'IBAN', required: true },
            { key: 'address', label: 'Address', required: false },
            { key: 'reference', label: 'Reference', required: false },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="label">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {key === 'address' ? (
                <textarea name={key} className="input-field focus:ring-0" rows={2} value={(form as any)[key]} onChange={handleChange} />
              ) : (
                <input type="text" name={key} className="input-field focus:ring-0" value={(form as any)[key]} onChange={handleChange} />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary focus:ring-0" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary focus:ring-0">Add Beneficiary</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Audit Log Panel ──────────────────────────────────────────────────────────

function AuditLogPanel({ beneficiaryId, onClose }: { beneficiaryId: string; onClose: () => void }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['beneficiary-audit', beneficiaryId],
    queryFn: () => beneficiaryApi.getAuditLogs(beneficiaryId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            Audit Log
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : logs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No audit entries yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div key={log.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">By: {log.performed_by}</p>
                  {log.detail && <p className="text-xs text-gray-600">{log.detail}</p>}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded p-2 text-xs space-y-1">
                      {Object.entries(log.changes).map(([field, vals]: [string, any]) => (
                        <div key={field}>
                          <span className="font-medium text-gray-700">{field}:</span>{' '}
                          <span className="text-red-500 line-through">{vals.old || '(empty)'}</span>
                          {' → '}
                          <span className="text-emerald-600">{vals.new || '(empty)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reject Reason Modal ──────────────────────────────────────────────────────

function RejectModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="font-semibold text-lg mb-4">Reject Beneficiary</h2>
        <label className="label">Reason for rejection</label>
        <textarea
          className="input-field"
          rows={3}
          placeholder="Provide a reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason)}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rejected', label: 'Rejected' },
];

export default function BeneficiaryManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<Beneficiary | null>(null);
  const [auditTarget, setAuditTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['all-beneficiaries', search, statusFilter],
    queryFn: async () => {
      // Use the base method — pass approval_status filter via API
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.approval_status = statusFilter;
      const { data } = await (await import('../services/api')).default.get('/beneficiaries', { params });
      return data as Beneficiary[];
    },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => beneficiaryApi.approve(id),
    onSuccess: () => {
      toast.success('Beneficiary approved');
      qc.invalidateQueries({ queryKey: ['all-beneficiaries'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Approval failed'),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => beneficiaryApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Beneficiary rejected');
      qc.invalidateQueries({ queryKey: ['all-beneficiaries'] });
      setRejectTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Rejection failed'),
  });

  const disableMut = useMutation({
    mutationFn: (id: string) => (beneficiaryApi as any).deactivate(id),
    onSuccess: () => {
      toast.success('Beneficiary disabled');
      qc.invalidateQueries({ queryKey: ['all-beneficiaries'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Disable failed'),
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, any>) => api.post('/beneficiaries', body),
    onSuccess: () => {
      toast.success('Beneficiary created');
      qc.invalidateQueries({ queryKey: ['all-beneficiaries'] });
      setShowAdd(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Creation failed'),
  });

  const [showAdd, setShowAdd] = useState(false);

  const { hasPermission } = useCurrentUser();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className="heading flex gap-2">
          {/* <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-700" />
          </div> */}
          <div>
            <h1>Beneficiary Management</h1>
            <p>Review, approve, and manage beneficiaries</p>
          </div>
        </div>
        <div className="">
          {hasPermission('create_beneficiary') && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" />
              Add Beneficiary
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg p-4 bg-white mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10 rounded focus:ring-0 focus:outline-none"
            placeholder="Search by account name, IBAN, BIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={clsx(
                'px-3 py-1.5 min-w-[50px] rounded text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-[#D3F263] border border-[#D3F263]'
                  : 'bg-white border border-[#D2E1E9] hover:bg-[#D3F263] outline-0 focus:ring-0',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)] border border-[#D2E1E9] overflow-x-auto">
        <table className="w-full text-sm ">
          <thead>
            <tr className='text-left border-b border-gray-200 bg-[#EFF5FB]'>
              <th className="p-2 pl-4 font-medium text-[#5D6B74] rounded-tl-lg">Account Name</th>
              <th className="p-2 font-medium text-[#5D6B74]">Bank / BIC</th>
              <th className="p-2 font-medium text-[#5D6B74]">IBAN</th>
              <th className="p-2 font-medium text-[#5D6B74] text-center">Status</th>
              <th className="p-2 font-medium text-[#5D6B74] text-center rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {beneficiaries.map((b: Beneficiary) => (
              <tr key={b.id} className="border-t border-[#D2E1E9]">
                <td className="p-2 pl-4 font-normal text-[#475259]">
                  <div className="flex">
                    <img src="../profile-small-icon.jpg" alt="Profile" className='rounded-full w-6 h-6 inline-block mr-2' />
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">
                        {b.account_name || b.name}</p>
                        {b.nickname && <p className="text-xs text-gray-400">{b.nickname}
                      </p>}
                    </div>
                  </div>
                </td>
                <td className="p-2 font-normal text-[#475259]">
                  <p className="text-gray-800">{b.bank_name || '—'}</p>
                  <p className="text-xs text-gray-400">{b.bic || ''}</p>
                </td>
                <td className="p-2 font-normal text-[#475259]">{b.iban || '—'}</td>
                <td className="p-2 font-normal text-[#475259] text-center">
                  <BeneficiaryStatusBadge status={b.approval_status} />
                  {b.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={b.rejection_reason}>
                      Reason: {b.rejection_reason}
                    </p>
                  )}
                </td>
                <td className="p-2 font-normal text-[#475259] text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      className="p-1.5 text-blue-600 bg-blue-50 rounded transition duration-colors hover:bg-blue-100"
                      title="Edit"
                      onClick={() => setEditTarget(b)}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 text-purple-600 bg-purple-50 rounded transition duration-colors hover:bg-purple-100"
                      title="Audit Log"
                      onClick={() => setAuditTarget(b.id)}
                    >
                      <History className="w-4 h-4" />
                    </button>
                    {(b.approval_status === 'pending_approval' || b.approval_status === 'under_review') && (
                      <>
                        <button
                          className="p-1.5 text-xs text-green-600 bg-green-50 rounded transition duration-colors hover:bg-green-100"
                          onClick={() => approveMut.mutate(b.id)}
                          title="Approve"
                          disabled={approveMut.isPending}
                        >
                      <UserRoundCheck className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-xs text-red-600 bg-red-50 rounded transition duration-colors hover:bg-red-100"
                          onClick={() => setRejectTarget(b.id)}
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {hasPermission('disable_beneficiary') && (
                      <button
                        className="p-1.5 text-xs text-red-600 bg-red-50 rounded transition duration-colors hover:bg-red-100"
                        onClick={() => disableMut.mutate(b.id)}
                        title="Disable"
>
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {beneficiaries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  No beneficiaries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editTarget && <EditModal beneficiary={editTarget} onClose={() => setEditTarget(null)} />}
      {auditTarget && <AuditLogPanel beneficiaryId={auditTarget} onClose={() => setAuditTarget(null)} />}
      {rejectTarget && (
        <RejectModal
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => rejectMut.mutate({ id: rejectTarget, reason })}
        />
      )}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onCreate={(body) => createMut.mutate(body)}
        />
      )}
    </div>
  );
}
