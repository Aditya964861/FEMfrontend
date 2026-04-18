import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Send,
  RefreshCw,
  Download,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Building2,
  CreditCard,
  Landmark,
  Globe,
  Users,
  Mail,
  Bell,
  Clock,
  XCircle,
} from 'lucide-react';
import { paymentApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import type { PaymentStatus } from '../types';

export default function PaymentInstructionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const piId = id!;

  const [showDocuSignForm, setShowDocuSignForm] = useState(false);
  const [editPrimary, setEditPrimary] = useState('');
  const [editSecondary, setEditSecondary] = useState('');
  const [editCC, setEditCC] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const { data: pi, isLoading } = useQuery({
    queryKey: ['payment-instruction', piId],
    queryFn: () => paymentApi.get(piId),
    enabled: !!piId,
  });

  // Fetch auto-pulled signer info from PayingEntity
  const { data: signerInfo, isLoading: signersLoading } = useQuery({
    queryKey: ['docusign-signers', piId],
    queryFn: () => paymentApi.getDocuSignSigners(piId),
    enabled: !!piId && !!pi?.pdf_filename && !pi?.docusign_envelope_id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-instruction', piId] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────
  const generatePdf = useMutation({
    mutationFn: () => paymentApi.generatePdf(piId),
    onSuccess: (data) => {
      if (data?.sharepoint_error) {
        toast.success('PDF generated (SharePoint upload skipped — not configured)');
      } else if (data?.pdf_web_view_url) {
        toast.success('PDF generated & uploaded to SharePoint');
      } else {
        toast.success('PDF generated successfully');
      }
      invalidate();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: { message?: string } | string } } })?.response?.data?.detail;
      const msg = typeof detail === 'object' && detail?.message ? detail.message : typeof detail === 'string' ? detail : 'PDF generation failed';
      toast.error(msg);
    },
  });

  const sendDocuSign = useMutation({
    mutationFn: () => paymentApi.sendForSignature(piId, {
      primary_signer_email: editPrimary || undefined,
      secondary_signers: editSecondary || undefined,
      cc_recipients: editCC || undefined,
    }),
    onSuccess: () => {
      toast.success('Sent for signature via DocuSign');
      setShowDocuSignForm(false);
      invalidate();
    },
    onError: () => toast.error('DocuSign send failed'),
  });

  const checkStatus = useMutation({
    mutationFn: () => paymentApi.checkDocuSignStatus(piId),
    onSuccess: (data) => {
      toast.success(`Status: ${data.status}`);
      invalidate();
    },
    onError: () => toast.error('Status check failed'),
  });

  const processSigned = useMutation({
    mutationFn: () => paymentApi.processSignedDocument(piId),
    onSuccess: () => {
      toast.success('Signed document processed and uploaded');
      invalidate();
    },
    onError: () => toast.error('Processing failed'),
  });

  const deletePi = useMutation({
    mutationFn: (reason: string) => paymentApi.delete(piId, reason),
    onSuccess: () => {
      toast.success('Deleted');
      navigate('/payment-instructions');
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Delete failed');
    },
  });

  const sendReminder = useMutation({
    mutationFn: () => paymentApi.sendReminder(piId),
    onSuccess: () => {
      toast.success('Reminder sent to pending signers');
      invalidate();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Failed to send reminder');
    },
  });

  const handleDownloadPdf = async () => {
    try {
      const blob = await paymentApi.downloadPdf(piId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pi?.pdf_filename || 'payment_instruction.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!pi) return <p className="text-red-500">Payment instruction not found.</p>;

  const hasPdf = !!pi.pdf_filename;
  const hasSent = !!pi.docusign_envelope_id;
  const isSigned = pi.status === 'signed';
  const isCompleted = pi.status === 'completed';
  const isOutstanding = ['sent', 'viewed', 'pending_signature'].includes(pi.status);
  const canDelete = !['sent', 'viewed', 'signed', 'completed'].includes(pi.status);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Payment Instruction</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete the PI for invoice <span className="font-semibold">{pi.invoice_number}</span> and
              restore the original invoice file back to SharePoint for re-use.
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
                onClick={() => { setShowDeleteConfirm(false); setDeleteReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!deleteReason.trim() || deletePi.isPending}
                onClick={() => deletePi.mutate(deleteReason.trim())}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletePi.isPending ? 'Deleting…' : 'Delete PI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Instruction
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={pi.status as PaymentStatus} />
              <span className="text-sm text-gray-500">
                Invoice: <span className="font-semibold text-gray-700">{pi.invoice_number}</span>
              </span>
              <span className="text-sm text-gray-400">
                Created {new Date(pi.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {/* ── Payment Details — navy header bar ────────────────────── */}
      <div className="mb-6">
        <div className="bg-primary-900 text-white text-center py-2 rounded-t-lg font-semibold text-lg flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </div>
        <div className="border-2 border-primary-900 border-t-0 rounded-b-lg bg-white px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice Date</label>
              <p className="font-medium text-gray-900">{pi.invoice_date}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Value Date</label>
              <p className="font-medium text-gray-900">{pi.value_date}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <p className="font-medium text-gray-900">{pi.category?.name || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount</label>
              <p className="font-bold text-xl text-primary-700">
                {pi.currency?.symbol}
                {pi.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                <span className="text-sm font-normal text-gray-400">{pi.currency?.code}</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Paying Entity</label>
              <p className="font-medium text-gray-900">{pi.paying_entity?.entity_name || '—'}</p>
              <p className="text-xs text-gray-400">{pi.paying_entity?.entity_identifier}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Template</label>
              <p className="font-medium text-gray-900">{pi.template?.name || '—'}</p>
            </div>
          </div>
          {(pi.description || pi.additional_info) && (
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {pi.description && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                  <p className="text-gray-700">{pi.description}</p>
                </div>
              )}
              {pi.additional_info && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Additional Info</label>
                  <p className="text-gray-700">{pi.additional_info}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Beneficiary Details — cyan header bar ────────────────── */}
      <div className="mb-6">
        <div className="bg-cyan-400 text-white text-center py-2 rounded-t-lg font-semibold text-lg flex items-center justify-center gap-2">
          <Building2 className="w-5 h-5" />
          Beneficiary Details
        </div>
        <div className="border-2 border-cyan-400 border-t-0 rounded-b-lg bg-white px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 min-h-[38px]">
                {pi.beneficiary?.name || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Account Name</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 min-h-[38px]">
                {pi.beneficiary?.account_name || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">IBAN</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 font-mono min-h-[38px]">
                {pi.beneficiary?.iban || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bank BIC/Swift</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 font-mono min-h-[38px]">
                {pi.beneficiary?.bic || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bank Name</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 min-h-[38px]">
                {pi.beneficiary?.bank_name || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Workflow Actions — emerald header bar ─────────────────── */}
      <div className="mb-6">
        <div className="bg-brand-dark text-brand-lime text-center py-2 rounded-t-lg font-semibold text-lg flex items-center justify-center gap-2">
          <Landmark className="w-5 h-5" />
          Workflow Actions
        </div>
        <div className="border-2 border-brand-dark border-t-0 rounded-b-lg bg-white px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Generate PI & Upload */}
            {!hasPdf && (
              <button
                onClick={() => generatePdf.mutate()}
                disabled={generatePdf.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-900 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {generatePdf.isPending ? 'Generating...' : 'Generate Draft & Upload'}
              </button>
            )}

            {/* Download PDF */}
            {hasPdf && (
              <button
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}

            {/* Send for Signature */}
            {hasPdf && !hasSent && (
              <>
                {!showDocuSignForm ? (
                  <button
                    onClick={() => {
                      // Pre-fill from PayingEntity defaults when opening
                      if (signerInfo) {
                        setEditPrimary(signerInfo.primary_signer?.email || '');
                        setEditSecondary(
                          (signerInfo.secondary_signers || [])
                            .map((s: { email: string }) => s.email)
                            .join(', ')
                        );
                        setEditCC(
                          (signerInfo.cc_recipients || [])
                            .map((c: { email: string }) => c.email)
                            .join(', ')
                        );
                      }
                      setShowDocuSignForm(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-lime text-brand-dark font-semibold rounded-lg hover:bg-brand-green transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Send for Signature
                  </button>
                ) : (
                  <div className="md:col-span-3 bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      DocuSign Recipients
                      <span className="font-normal text-gray-400 text-xs">(auto-filled from Paying Entity — editable)</span>
                    </h4>

                    {signersLoading ? (
                      <p className="text-sm text-gray-500">Loading signer info...</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Primary Signer */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <Mail className="w-3 h-3" /> Primary Signer (RCS Signature)
                          </label>
                          <input
                            type="email"
                            className="w-full px-3 py-2 border-2 border-primary-900 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="primary.signer@company.com"
                            value={editPrimary}
                            onChange={(e) => setEditPrimary(e.target.value)}
                          />
                        </div>

                        {/* Secondary Signers */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <Users className="w-3 h-3" /> Secondary Signers — Any One Signs
                            <span className="font-normal normal-case text-gray-400">(comma-separated)</span>
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border-2 border-amber-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="signer1@company.com, signer2@company.com"
                            value={editSecondary}
                            onChange={(e) => setEditSecondary(e.target.value)}
                          />
                        </div>

                        {/* CC Recipients */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <Mail className="w-3 h-3" /> CC Recipients
                            <span className="font-normal normal-case text-gray-400">(comma-separated)</span>
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="cc1@company.com, cc2@company.com"
                            value={editCC}
                            onChange={(e) => setEditCC(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => sendDocuSign.mutate()}
                        disabled={!editPrimary.trim() || sendDocuSign.isPending}
                        className="px-6 py-2 bg-brand-lime text-brand-dark font-semibold rounded text-sm hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendDocuSign.isPending ? 'Sending...' : 'Confirm & Send'}
                      </button>
                      <button
                        onClick={() => setShowDocuSignForm(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Refresh Status */}
            {hasSent && !isCompleted && (
              <button
                onClick={() => checkStatus.mutate()}
                disabled={checkStatus.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checkStatus.isPending ? 'animate-spin' : ''}`} />
                {checkStatus.isPending ? 'Checking...' : 'Refresh Status'}
              </button>
            )}

            {/* Outstanding indicator */}
            {isOutstanding && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Awaiting signatures — auto-polling every 5 min
              </div>
            )}

            {/* Process Signed Document */}
            {isSigned && !pi.signed_pdf_filename && (
              <button
                onClick={() => processSigned.mutate()}
                disabled={processSigned.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-lime text-brand-dark font-semibold rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {processSigned.isPending ? 'Processing...' : 'Process Signed Document'}
              </button>
            )}

            {/* Completed indicator */}
            {isCompleted && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Signed document saved to SharePoint
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SharePoint & DocuSign Info — only if relevant ─────────── */}
      {(pi.pdf_sharepoint_url || pi.signed_pdf_sharepoint_url || pi.invoice_sharepoint_url || pi.docusign_envelope_id) && (
        <div className="mb-6">
          <div className="bg-indigo-600 text-white text-center py-2 rounded-t-lg font-semibold text-lg flex items-center justify-center gap-2">
            <Globe className="w-5 h-5" />
            Links & Integration
          </div>
          <div className="border-2 border-indigo-600 border-t-0 rounded-b-lg bg-white px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SharePoint Links */}
              {(pi.pdf_sharepoint_url || pi.signed_pdf_sharepoint_url || pi.invoice_sharepoint_url) && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">SharePoint</label>
                  <div className="space-y-2">
                    {pi.invoice_sharepoint_url && (
                      <a href={pi.invoice_sharepoint_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Invoice File
                      </a>
                    )}
                    {pi.pdf_sharepoint_url && (
                      <a href={pi.pdf_sharepoint_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> PI PDF
                      </a>
                    )}
                    {pi.signed_pdf_sharepoint_url && (
                      <a href={pi.signed_pdf_sharepoint_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Signed PDF
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* DocuSign Info */}
              {pi.docusign_envelope_id && (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">DocuSign</label>
                    {['sent', 'viewed'].includes(pi.status) && (
                      <button
                        onClick={() => sendReminder.mutate()}
                        disabled={sendReminder.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        {sendReminder.isPending ? 'Sending…' : 'Send Reminder'}
                      </button>
                    )}
                  </div>
                  <div className="text-sm space-y-1.5">
                    <p><span className="text-gray-500">Envelope:</span> <span className="font-mono text-xs text-gray-700">{pi.docusign_envelope_id}</span></p>
                    {pi.docusign_sent_at && (
                      <p><span className="text-gray-500">Sent:</span> <span className="text-gray-700">{new Date(pi.docusign_sent_at).toLocaleString()}</span></p>
                    )}
                    {pi.docusign_signed_at && (
                      <p><span className="text-gray-500">Completed:</span> <span className="text-gray-700">{new Date(pi.docusign_signed_at).toLocaleString()}</span></p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primary Signer */}
                    <div className={`rounded-lg p-3 border ${pi.primary_signer_status === 'completed' ? 'bg-green-50 border-green-200' : pi.primary_signer_status === 'declined' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Mail className={`w-3.5 h-3.5 ${pi.primary_signer_status === 'completed' ? 'text-green-600' : pi.primary_signer_status === 'declined' ? 'text-red-600' : 'text-blue-600'}`} />
                          <span className={`text-xs font-bold uppercase tracking-wider ${pi.primary_signer_status === 'completed' ? 'text-green-700' : pi.primary_signer_status === 'declined' ? 'text-red-700' : 'text-blue-700'}`}>Primary Signer</span>
                        </div>
                        {pi.primary_signer_status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            pi.primary_signer_status === 'completed' ? 'bg-green-100 text-green-700' :
                            pi.primary_signer_status === 'declined' ? 'bg-red-100 text-red-700' :
                            pi.primary_signer_status === 'delivered' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {pi.primary_signer_status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                             pi.primary_signer_status === 'declined' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {pi.primary_signer_status === 'completed' ? 'Signed' :
                             pi.primary_signer_status === 'delivered' ? 'Viewed' :
                             pi.primary_signer_status === 'declined' ? 'Declined' : 'Waiting'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{pi.docusign_recipient_name || '—'}</p>
                      <p className="text-sm text-gray-600">{pi.docusign_recipient_email || '—'}</p>
                      {pi.primary_signed_at && (
                        <p className="text-xs text-green-600 mt-1">Signed: {new Date(pi.primary_signed_at).toLocaleString()}</p>
                      )}
                    </div>

                    {/* Secondary Signers */}
                    <div className={`rounded-lg p-3 border ${pi.secondary_signer_status === 'completed' ? 'bg-green-50 border-green-200' : pi.secondary_signer_status === 'declined' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Users className={`w-3.5 h-3.5 ${pi.secondary_signer_status === 'completed' ? 'text-green-600' : pi.secondary_signer_status === 'declined' ? 'text-red-600' : 'text-amber-600'}`} />
                          <span className={`text-xs font-bold uppercase tracking-wider ${pi.secondary_signer_status === 'completed' ? 'text-green-700' : pi.secondary_signer_status === 'declined' ? 'text-red-700' : 'text-amber-700'}`}>Secondary Signer</span>
                        </div>
                        {pi.secondary_signer_status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            pi.secondary_signer_status === 'completed' ? 'bg-green-100 text-green-700' :
                            pi.secondary_signer_status === 'declined' ? 'bg-red-100 text-red-700' :
                            pi.secondary_signer_status === 'delivered' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {pi.secondary_signer_status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                             pi.secondary_signer_status === 'declined' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {pi.secondary_signer_status === 'completed' ? 'Signed' :
                             pi.secondary_signer_status === 'delivered' ? 'Viewed' :
                             pi.secondary_signer_status === 'declined' ? 'Declined' : 'Waiting'}
                          </span>
                        )}
                      </div>
                      {pi.secondary_signer_name && (
                        <p className="text-sm font-medium text-green-700 mb-1">✓ Signed by: {pi.secondary_signer_name}</p>
                      )}
                      {pi.docusign_secondary_signers ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-400 mb-0.5">Group members (any one signs):</p>
                          {pi.docusign_secondary_signers.split(',').map((email: string, i: number) => (
                            <p key={i} className="text-sm text-gray-700">{email.trim()}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">None</p>
                      )}
                      {pi.secondary_signed_at && (
                        <p className="text-xs text-green-600 mt-1">Signed: {new Date(pi.secondary_signed_at).toLocaleString()}</p>
                      )}
                    </div>

                    {/* CC Recipients */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">CC Recipients</span>
                      </div>
                      {pi.docusign_cc_recipients ? (
                        <div className="space-y-0.5">
                          {pi.docusign_cc_recipients.split(',').map((email: string, i: number) => (
                            <p key={i} className="text-sm text-gray-700">{email.trim()}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">None</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
