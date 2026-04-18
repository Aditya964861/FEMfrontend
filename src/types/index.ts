/**
 * Fund Management — TypeScript Type Definitions
 * (Updated for MongoDB — all IDs are strings)
 */

// ── Reference Data ──────────────────────────────────────────────────────────

export interface PayingEntity {
  id: string;
  entity_name: string;
  entity_identifier: string;
  account_bank?: string;
  account_currency?: string;
  account_number?: string;
  iban?: string;
  primary_address?: string;
  secondary_address?: string;
  city?: string;
  agreement?: string;
  authorised_signatories?: string;
  docusign_signing_group?: string;
  email_to?: string;
  email_cc?: string;
  signature_emails?: string;
  signature_emails_cc?: string;
  signature_primary?: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  is_active: boolean;
}

export interface Bank {
  id: string;
  name: string;
  swift_code: string;
  correspondent_bank?: string;
  address?: string;
  country?: string;
  is_active: boolean;
}

export interface Beneficiary {
  id: string;
  name: string;
  nickname?: string;
  account_name?: string;
  bank_name?: string;
  bic?: string;
  iban?: string;
  address?: string;
  reference?: string;
  is_active: boolean;
  approval_status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_by?: string;
  last_modified_by?: string;
}

export interface PaymentTemplate {
  id: string;
  name: string;
  description?: string;
  filename: string;
  bank_id?: string;
  bank?: Bank;
  is_active: boolean;
}

// ── Payment Instruction ─────────────────────────────────────────────────────

export type PaymentStatus =
  | 'draft'
  | 'pending_signature'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided';

export interface PaymentInstruction {
  id: string;
  invoice_number: string;
  invoice_id?: string;
  invoice_date: string;
  value_date: string;
  invoice_filename?: string;
  amount: number;
  account_name?: string;
  description?: string;
  additional_info?: string;
  status: PaymentStatus;

  paying_entity_id: string;
  paying_entity?: PayingEntity;
  category_id: string;
  category?: Category;
  currency_id: string;
  currency?: Currency;
  beneficiary_id: string;
  beneficiary?: Beneficiary;
  template_id: string;
  template?: PaymentTemplate;

  pdf_filename?: string;
  pdf_sharepoint_url?: string;
  signed_pdf_filename?: string;
  signed_pdf_sharepoint_url?: string;

  docusign_envelope_id?: string;
  docusign_recipient_email?: string;
  docusign_recipient_name?: string;
  docusign_secondary_signers?: string;
  docusign_cc_recipients?: string;
  docusign_sent_at?: string;
  docusign_signed_at?: string;

  // Per-signer status tracking
  primary_signer_status?: string;
  secondary_signer_status?: string;
  secondary_signer_name?: string;
  primary_signed_at?: string;
  secondary_signed_at?: string;

  invoice_sharepoint_url?: string;

  // Signatory fields
  signature_a?: string;
  signatory_a_name?: string;
  signatory_b_name?: string;
  signature_b_date?: string;

  // Folder tracking
  folder_path?: string;
  folder_id?: string;

  // Denormalized beneficiary snapshot
  beneficiary_name?: string;
  beneficiary_account_name?: string;
  beneficiary_bank_name?: string;
  beneficiary_iban?: string;
  bank_bic_swift_code?: string;

  created_at: string;
  updated_at: string;
}

export interface PaymentInstructionCreate {
  invoice_number: string;
  invoice_id?: string;
  invoice_date: string;
  value_date: string;
  invoice_filename?: string;
  amount: number;
  account_name?: string;
  description?: string;
  additional_info?: string;
  paying_entity_id: string;
  category_id: string;
  currency_id: string;
  beneficiary_id: string;
  template_id: string;
  invoice_sharepoint_url?: string;
}

// ── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_invited: boolean;
  role: string;
  groups?: string[];
  custom_permissions?: string[];
}

export interface RoleGroup {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// ── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  payment_instruction_id?: string;
  action: string;
  performed_by: string;
  detail?: string;
  ip_address?: string;
  created_at: string;
}

export interface UnifiedAuditLog {
  id: string;
  log_type: 'pi' | 'beneficiary';
  action: string;
  performed_by: string;
  detail?: string;
  ip_address?: string;
  created_at: string;
  payment_instruction_id?: string;
  beneficiary_id?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface AuditLogPage {
  items: UnifiedAuditLog[];
  total: number;
  page: number;
  page_size: number;
}

// ── DocuSign ────────────────────────────────────────────────────────────────

export interface DocuSignSendRequest {
  payment_instruction_id: string;
  signer_email: string;
  signer_name: string;
}

// ── Select Options ──────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}
