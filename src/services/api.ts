/**
 * Fund Management — API Client
 *
 * Axios instance with MSAL token interceptors and typed API methods.
 */

import axios from 'axios';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import type {
  Beneficiary,
  Bank,
  Category,
  Currency,
  PaginatedResponse,
  PayingEntity,
  PaymentInstruction,
  PaymentInstructionCreate,
  PaymentTemplate,
  AuditLog,
  AuditLogPage,
  User,
} from '../types';
import { tokenRequest } from './authConfig';
import { msalInstance } from './msalInstance';

// API_BASE can be set via env for prod; fall back to sensible defaults
// - dev: localhost frontend -> backend at 4883
// - prod: assume feapi.riverrock.eu
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:4883/api/v1'
    : 'https://feapi.riverrock.eu/api/v1');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth Interceptor — acquire Entra ID token silently ──────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const account = msalInstance.getActiveAccount();
    if (account) {
      const response = await msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account,
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    }
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Avoid redirect loops — only redirect once
      console.warn('[API] Token acquisition requires interaction, redirecting...');
      msalInstance.acquireTokenRedirect(tokenRequest);
      // Return a cancelled request to avoid sending unauthenticated calls
      return Promise.reject(new Error('Redirecting for authentication'));
    }
    console.error('[API] Token acquisition failed:', error);
  }
  return config;
});

// Track whether we're already handling a 401 to prevent redirect loops
let isHandling401 = false;

api.interceptors.response.use(
  (response) => {
    isHandling401 = false;
    return response;
  },
  async (error) => {
    // Do NOT redirect on 403 — that means the user is authenticated but not authorized
    // Only redirect on 401 if we haven't already tried
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;
      console.warn('[API] 401 received — will not auto-redirect to avoid loops');
    }
    return Promise.reject(error);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// Auth — Entra ID (no email/password login; managed by MSAL)
// ═══════════════════════════════════════════════════════════════════════════════

export const authApi = {
  logout: () => {
    msalInstance.logoutRedirect({ postLogoutRedirectUri: '/' });
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Reference Data
// ═══════════════════════════════════════════════════════════════════════════════

export const referenceApi = {
  // Paying Entities
  getPayingEntities: async (search?: string): Promise<PayingEntity[]> => {
    const params = search ? { search } : {};
    const { data } = await api.get<PayingEntity[]>('/paying-entities', { params });
    return data;
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories');
    return data;
  },

  // Currencies
  getCurrencies: async (): Promise<Currency[]> => {
    const { data } = await api.get<Currency[]>('/currencies');
    return data;
  },

  // Banks
  getBanks: async (): Promise<Bank[]> => {
    const { data } = await api.get('/banks');
    return data;
  },

  // Beneficiaries
  getBeneficiaries: async (search?: string, approvedOnly = false): Promise<Beneficiary[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (approvedOnly) params.approved_only = 'true';
    const { data } = await api.get<Beneficiary[]>('/beneficiaries', { params });
    return data;
  },

  getBeneficiary: async (id: string): Promise<Beneficiary> => {
    const { data } = await api.get<Beneficiary>(`/beneficiaries/${id}`);
    return data;
  },

  // Payment Templates
  getPaymentTemplates: async (bankId?: string): Promise<PaymentTemplate[]> => {
    const params = bankId ? { bank_id: bankId } : {};
    const { data } = await api.get<PaymentTemplate[]>('/payment-templates', { params });
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Instructions
// ═══════════════════════════════════════════════════════════════════════════════

export const paymentApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<PaymentInstruction>> => {
    const { data } = await api.get('/payment-instructions/', { params });
    return data;
  },

  get: async (id: string): Promise<PaymentInstruction> => {
    const { data } = await api.get<PaymentInstruction>(`/payment-instructions/${id}`);
    return data;
  },

  create: async (body: PaymentInstructionCreate): Promise<PaymentInstruction> => {
    const { data } = await api.post<PaymentInstruction>('/payment-instructions/', body);
    return data;
  },

  /**
   * Check if a PI already exists for the given invoice number.
   * Returns { exists: boolean, pi_id?, status?, amount?, ... }
   */
  checkDuplicate: async (invoiceNumber: string) => {
    const { data } = await api.get('/payment-instructions/check-duplicate', {
      params: { invoice_number: invoiceNumber },
    });
    return data as {
      exists: boolean;
      pi_id?: string;
      invoice_number?: string;
      status?: string;
      amount?: number;
      created_at?: string;
    };
  },

  update: async (
    id: string,
    body: Partial<PaymentInstructionCreate>,
  ): Promise<PaymentInstruction> => {
    const { data } = await api.patch<PaymentInstruction>(
      `/payment-instructions/${id}`,
      body,
    );
    return data;
  },

  delete: async (id: string, reason?: string): Promise<void> => {
    const params = reason ? { reason } : undefined;
    await api.delete(`/payment-instructions/${id}`, { params });
  },

  // PDF (generate + upload to SharePoint + archive invoice)
  generatePdf: async (id: string) => {
    const { data } = await api.post(`/payment-instructions/${id}/create-pi-pdf`);
    return data;
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await api.get(`/payment-instructions/${id}/download-pdf`, {
      responseType: 'blob',
    });
    return data;
  },

  // SharePoint
  uploadToSharePoint: async (id: string) => {
    const { data } = await api.post(`/payment-instructions/${id}/upload-sharepoint`);
    return data;
  },

  // DocuSign
  sendForSignature: async (
    id: string,
    overrides?: {
      primary_signer_email?: string;
      primary_signer_name?: string;
      secondary_signers?: string;
      cc_recipients?: string;
    },
  ) => {
    const { data } = await api.post(`/payment-instructions/${id}/send-docusign`, {
      payment_instruction_id: id,
      ...overrides,
    });
    return data;
  },

  getDocuSignSigners: async (id: string) => {
    const { data } = await api.get(`/payment-instructions/${id}/docusign-signers`);
    return data;
  },

  checkDocuSignStatus: async (id: string) => {
    const { data } = await api.get(`/payment-instructions/${id}/docusign-status`);
    return data;
  },

  sendReminder: async (id: string) => {
    const { data } = await api.post(`/payment-instructions/${id}/send-reminder`);
    return data;
  },

  processSignedDocument: async (id: string) => {
    const { data } = await api.post(`/payment-instructions/${id}/process-signed`);
    return data;
  },

  processAllSigned: async () => {
    const { data } = await api.post('/payment-instructions/process-all-signed');
    return data;
  },

  pollOutstanding: async () => {
    const { data } = await api.post('/payment-instructions/poll-outstanding');
    return data;
  },

  // Audit
  getAuditLogs: async (id: string): Promise<AuditLog[]> => {
    const { data } = await api.get<AuditLog[]>(
      `/payment-instructions/${id}/audit-logs`,
    );
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// User Management (Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const userApi = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get('/users/');
    return data;
  },

  invite: async (body: { email: string; full_name: string; role?: string; groups?: string[]; custom_permissions?: string[] }) => {
    const { data } = await api.post('/users/invite', body);
    return data;
  },

  updateRole: async (userId: string, body: { role?: string; groups?: string[]; custom_permissions?: string[] }) => {
    const { data } = await api.patch(`/users/${userId}/role`, body);
    return data;
  },

  deactivate: async (userId: string) => {
    const { data } = await api.patch(`/users/${userId}/deactivate`);
    return data;
  },

  activate: async (userId: string) => {
    const { data } = await api.patch(`/users/${userId}/activate`);
    return data;
  },
  getRoleGroups: async () => {
    const { data } = await api.get('/users/roles');
    return data as import('../types').RoleGroup[];
  },
  createRoleGroup: async (body: { name: string; description?: string; permissions?: string[] }) => {
    const { data } = await api.post('/users/roles', body);
    return data as import('../types').RoleGroup;
  },
  updateRoleGroup: async (id: string, body: { name: string; description?: string; permissions?: string[] }) => {
    const { data } = await api.patch(`/users/roles/${id}`, body);
    return data as import('../types').RoleGroup;
  },
  deleteRoleGroup: async (id: string) => {
    const { data } = await api.delete(`/users/roles/${id}`);
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Beneficiary Approval
// ═══════════════════════════════════════════════════════════════════════════════

export const beneficiaryApi = {
  approve: async (id: string) => {
    const { data } = await api.post(`/beneficiaries/${id}/approve`, { action: 'approve' });
    return data;
  },

  reject: async (id: string, reason: string) => {
    const { data } = await api.post(`/beneficiaries/${id}/approve`, {
      action: 'reject',
      rejection_reason: reason,
    });
    return data;
  },

  update: async (id: string, body: Record<string, string>) => {
    const { data } = await api.patch(`/beneficiaries/${id}`, body);
    return data;
  },

  getAuditLogs: async (id: string) => {
    const { data } = await api.get(`/beneficiaries/${id}/audit-logs`);
    return data;
  },
  deactivate: async (id: string) => {
    const { data } = await api.patch(`/beneficiaries/${id}/deactivate`);
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SharePoint — Invoice Upload
// ═══════════════════════════════════════════════════════════════════════════════

export const sharepointApi = {
  /**
   * Upload an invoice file to the SharePoint Pending_Invoices folder.
   */
  uploadInvoice: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/sharepoint/upload-invoice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as {
      message: string;
      filename: string;
      web_url: string;
      file_id: string;
      size: number;
    };
  },

  /**
   * List invoice files in the Pending_Invoices folder.
   */
  listPendingInvoices: async () => {
    const { data } = await api.get('/sharepoint/pending-invoices');
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Audit Logs (Global)
// ═══════════════════════════════════════════════════════════════════════════════

export const auditApi = {
  list: async (params: {
    page?: number;
    page_size?: number;
    log_type?: string;
    search?: string;
  } = {}): Promise<AuditLogPage> => {
    const { data } = await api.get<AuditLogPage>('/audit-logs/', { params });
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DocuSign Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocuSignConfigRead {
  id: string | null;
  client_id: string;
  account_id: string;
  base_url: string;
  auth_server: string;
  token_type: string;
  has_access_token: boolean;
  has_refresh_token: boolean;
  access_token_expires_at: string | null;
  last_refreshed_at: string | null;
  last_refresh_error: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocuSignConfigCreate {
  client_id: string;
  client_secret: string;
  account_id: string;
  base_url: string;
  auth_server: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  access_token_expires_at?: string;
}

export const docuSignConfigApi = {
  get: async (): Promise<DocuSignConfigRead> => {
    const { data } = await api.get<DocuSignConfigRead>('/docusign-config/');
    return data;
  },

  upsert: async (body: DocuSignConfigCreate): Promise<DocuSignConfigRead> => {
    const { data } = await api.post<DocuSignConfigRead>('/docusign-config/', body);
    return data;
  },

  refresh: async (): Promise<{ status: string; expires_at?: string; reason?: string }> => {
    const { data } = await api.post('/docusign-config/refresh');
    return data;
  },

  delete: async (): Promise<{ message: string }> => {
    const { data } = await api.delete('/docusign-config/');
    return data;
  },
};

export default api;
