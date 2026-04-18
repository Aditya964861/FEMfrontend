// Grouped permissions for the UI. Each group contains labelled permission keys.
// Keep this list in sync with backend `ROLE_PERMISSIONS` when adding new permissions.

export const PERMISSION_GROUPS: { group: string; perms: { id: string; label: string }[] }[] = [
  {
    group: 'Beneficiary',
    perms: [
      { id: 'create_beneficiary', label: 'Add New' },
      { id: 'edit_beneficiary', label: 'Edit' },
      { id: 'approve_beneficiary', label: 'Approve' },
      { id: 'disable_beneficiary', label: 'Disable / Reactivate' },
      { id: 'view_audit_logs', label: 'View Audit Logs' },
      { id: 'delete_beneficiary', label: 'Delete' },
    ],
  },
  {
    group: 'Payment Instruction',
    perms: [
      { id: 'create_pi', label: 'Create' },
      { id: 'edit_pi', label: 'Edit' },
      { id: 'delete_pi', label: 'Delete' },
      { id: 'generate_pi', label: 'Generate PI / PDF' },
      { id: 'view_pi', label: 'View' },
      { id: 'upload_sharepoint', label: 'Upload to SharePoint' },
      { id: 'send_docusign', label: 'Send DocuSign' },
      { id: 'view_audit_logs', label: 'View Audit Logs' },
    ],
  },
  {
    group: 'Templates & System',
    perms: [
      { id: 'manage_templates', label: 'Manage Templates' },
      { id: 'manage_users', label: 'Manage Users' },
      { id: 'manage_docusign_config', label: 'Manage DocuSign Config' },
      { id: 'upload_invoice', label: 'Upload Invoice' },
      { id: 'view_audit_logs', label: 'View Audit Logs' },
    ],
  },
];

export const ALL_PERMISSIONS = Array.from(new Set(PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.id))));

export default PERMISSION_GROUPS;
