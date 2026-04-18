import { useState, useEffect, useCallback } from 'react';
import {
  // Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  // Key,
  // Save,
  // Trash2,
} from 'lucide-react';
import { docuSignConfigApi, type DocuSignConfigRead, type DocuSignConfigCreate } from '../services/api';

export default function DocuSignConfigPage() {
  const [config, setConfig] = useState<DocuSignConfigRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [form, setForm] = useState<DocuSignConfigCreate>({
    client_id: '',
    client_secret: '',
    account_id: '',
    base_url: 'https://demo.docusign.net/restapi',
    auth_server: 'account-d.docusign.com',
    access_token: '',
    refresh_token: '',
    token_type: 'Bearer',
    access_token_expires_at: '',
  });

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const data = await docuSignConfigApi.get();
      setConfig(data);
      setForm((prev) => ({
        ...prev,
        client_id: data.client_id,
        account_id: data.account_id,
        base_url: data.base_url,
        auth_server: data.auth_server,
        token_type: data.token_type,
        // Don't overwrite secret/tokens — user must re-enter to update
        client_secret: '',
        access_token: '',
        refresh_token: '',
        access_token_expires_at: data.access_token_expires_at || '',
      }));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
        setConfig(null);
      } else {
        setError('Failed to load DocuSign configuration');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload: DocuSignConfigCreate = {
        client_id: form.client_id,
        client_secret: form.client_secret,
        account_id: form.account_id,
        base_url: form.base_url,
        auth_server: form.auth_server,
        token_type: form.token_type || 'Bearer',
      };

      // Only include tokens if provided
      if (form.access_token) payload.access_token = form.access_token;
      if (form.refresh_token) payload.refresh_token = form.refresh_token;
      if (form.access_token_expires_at) payload.access_token_expires_at = form.access_token_expires_at;

      const data = await docuSignConfigApi.upsert(payload);
      setConfig(data);
      setNotFound(false);
      setSuccess('DocuSign configuration saved successfully');

      // Clear sensitive fields after save
      setForm((prev) => ({
        ...prev,
        client_secret: '',
        access_token: '',
        refresh_token: '',
      }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    setRefreshing(true);

    try {
      const result = await docuSignConfigApi.refresh();
      if (result.status === 'success') {
        setSuccess(`Tokens refreshed. Expires at: ${result.expires_at}`);
        await loadConfig();
      } else {
        setError(`Refresh failed: ${result.reason || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Token refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate the DocuSign configuration?')) return;

    setError(null);
    setSuccess(null);

    try {
      await docuSignConfigApi.delete();
      setConfig(null);
      setNotFound(true);
      setSuccess('DocuSign configuration deactivated');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to deactivate');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
  <>
    {/* Heading */}
    <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
      <div className='heading'>
        <h1>
          DocuSign Configuration
        </h1>
        <p>
          Manage OAuth2 credentials and tokens. Tokens are automatically refreshed every 6 hours.
        </p>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-[0_4px_16px_0_rgba(205,211,223,0.25)]">

      <div className="max-w-5xl space-y-6">

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Token Status Card */}
        {config && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 bg-brand-navy rounded-t-lg">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Token Status
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">Access Token</span>
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${config.has_access_token ? 'text-green-600' : 'text-red-500'}`}>
                  {config.has_access_token ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {config.has_access_token ? 'Present' : 'Missing'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Refresh Token</span>
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${config.has_refresh_token ? 'text-green-600' : 'text-red-500'}`}>
                  {config.has_refresh_token ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {config.has_refresh_token ? 'Present' : 'Missing'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Expires At</span>
                <span className="text-sm text-gray-800">{formatDate(config.access_token_expires_at)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Last Refreshed</span>
                <span className="text-sm text-gray-800">{formatDate(config.last_refreshed_at)}</span>
              </div>
            </div>
            {config.last_refresh_error && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Last refresh error: {config.last_refresh_error}</span>
                </div>
              </div>
            )}
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-lime text-brand-dark text-sm rounded hover:bg-brand-green disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">

          {/* Heading */}
          <div className="flex items-center justify-between bg-[#326382] p-4 py-2 rounded-t-lg">
            <div className='heading'>
              <h2 className='text-white'>
                  {/* <Settings className="w-4 h-4" /> */}
                  {config ? 'Update Configuration' : 'Create Configuration'}
              </h2>
            </div>
          </div>

          <div className="p-4 space-y-4 form-default-component">
            {/* Client Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Client ID (Integration Key)</label>
                <input
                  type="text"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className=""
                  placeholder="d771498a-c78f-4b93-..."
                />
              </div>
              <div>
                <label>
                  Client Secret {config && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={form.client_secret}
                  onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                  className=""
                  placeholder={config ? '••••••••' : 'Enter client secret'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label>Account ID</label>
                <input
                  type="text"
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className=""
                  placeholder="9e454313-2643-..."
                />
              </div>
              <div>
                <label>Base URL</label>
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  className=""
                />
              </div>
              <div>
                <label>Auth Server</label>
                <input
                  type="text"
                  value={form.auth_server}
                  onChange={(e) => setForm({ ...form, auth_server: e.target.value })}
                  className=""
                />
              </div>
            </div>

            {/* Token fields */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                OAuth2 Tokens {config && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </h3>
              <div className="space-y-3">
                <div>
                  <label>Access Token</label>
                  <textarea
                    value={form.access_token || ''}
                    onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                    className=""
                    rows={2}
                    placeholder="Paste access token here..."
                  />
                </div>
                <div>
                  <label>Refresh Token</label>
                  <textarea
                    value={form.refresh_token || ''}
                    onChange={(e) => setForm({ ...form, refresh_token: e.target.value })}
                    className=""
                    rows={2}
                    placeholder="Paste refresh token here..."
                  />
                </div>
                <div>
                  <label>Access Token Expires At (ISO 8601)</label>
                  <input
                    type="text"
                    value={form.access_token_expires_at || ''}
                    onChange={(e) => setForm({ ...form, access_token_expires_at: e.target.value })}
                    className=""
                    placeholder="2026-02-18T18:30:01Z"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving || !form.client_id || !form.account_id || (!config && !form.client_secret)}
                className="btn-primary disabled:opacity-50"
              >
                {/* <Save className="w-4 h-4" /> */}
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              {config && (
                <button
                  onClick={handleDelete}
                  className="btn-danger"
                >
                  {/* <Trash2 className="w-4 h-4" /> */}
                  Deactivate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        {notFound && (
          <div className="bg-[#FFF6F6] border border-[#F6D1D1] rounded-lg p-4 text-sm text-[#E91E63]">
            <strong>No Configuration Found:</strong> Enter your DocuSign credentials below to get started.
          </div>
        )}
        <div className="bg-[#EBF8FE] border border-[#C4E3F2] rounded-lg p-4 text-sm text-[#0097db]">
          <strong>Automatic Refresh:</strong> The background scheduler refreshes DocuSign tokens every 6 hours
          (4 times per day). An initial refresh is attempted on server startup. If the access token expires between
          refreshes, it will be refreshed on-demand when a DocuSign API call is made.
        </div>

      </div>


    </div>
    </>
  );
}
