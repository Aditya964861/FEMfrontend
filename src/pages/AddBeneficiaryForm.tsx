import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function AddBeneficiaryForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    account_name: '',
    nickname: '',
    bank_name: '',
    bic: '',
    iban: '',
    address: '',
    reference: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = Object.entries(form)
      .filter(([k, v]) => !['address', 'reference'].includes(k) && !v.trim());
    if (missing.length > 0) {
      toast.error('All fields are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/beneficiaries', {
        account_name: form.account_name,
        nickname: form.nickname,
        bank_name: form.bank_name,
        bic: form.bic,
        iban: form.iban,
        address: form.address,
        reference: form.reference,
      });
      toast.success('Beneficiary created successfully');
      navigate('/payment-instructions/new');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create beneficiary');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-primary-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Beneficiary</h1>
          <p className="text-gray-500 text-sm">
            Register a new beneficiary for payment instructions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Account Name (primary identifier) */}
        <div>
          <label className="label">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="account_name"
            className="input-field"
            value={form.account_name}
            onChange={handleChange}
            placeholder="e.g. Acme Corp Operations Account"
            required
          />
        </div>

        {/* Nickname */}
        <div>
          <label className="label">
            Nickname <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nickname"
            className="input-field"
            value={form.nickname}
            onChange={handleChange}
            placeholder="Short name used in filenames, e.g. AcmeCo"
            required
          />
        </div>

        {/* Bank Name */}
        <div>
          <label className="label">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bank_name"
            className="input-field"
            value={form.bank_name}
            onChange={handleChange}
            placeholder="e.g. JPMorgan Chase Bank"
            required
          />
        </div>

        {/* BIC / SWIFT */}
        <div>
          <label className="label">
            BIC / SWIFT Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bic"
            className="input-field"
            value={form.bic}
            onChange={handleChange}
            placeholder="e.g. CHASUS33"
            required
          />
        </div>

        {/* IBAN */}
        <div>
          <label className="label">
            IBAN <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="iban"
            className="input-field"
            value={form.iban}
            onChange={handleChange}
            placeholder="e.g. GB29NWBK60161331926819"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="label">
            Address
          </label>
          <textarea
            name="address"
            className="input-field"
            rows={2}
            value={form.address}
            onChange={handleChange}
            placeholder="Beneficiary address"
          />
        </div>

        {/* Reference */}
        <div>
          <label className="label">
            Reference
          </label>
          <input
            type="text"
            name="reference"
            className="input-field"
            value={form.reference}
            onChange={handleChange}
            placeholder="Internal reference"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={submitting}
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? 'Creating…' : 'Add Beneficiary'}
          </button>
        </div>
      </form>
    </div>
  );
}
