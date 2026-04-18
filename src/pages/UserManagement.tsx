import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {  UserPlus, Loader2, Ban, UserRoundCheck, X } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { userApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage users, approve, create' },
  { value: 'operator', label: 'Operator', desc: 'Create PIs, manage beneficiaries' },
  { value: 'beneficiary_manager', label: 'Beneficiary Manager', desc: 'Create & edit beneficiaries' },
  { value: 'beneficiary_disabler', label: 'Beneficiary Disabler', desc: 'Disable / reactivate beneficiaries' },
  { value: 'beneficiary_approver', label: 'Beneficiary Approver', desc: 'Approve / reject beneficiaries' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
];

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  operator: 'bg-blue-100 text-blue-800',
  beneficiary_manager: 'bg-emerald-100 text-emerald-800',
  beneficiary_approver: 'bg-amber-100 text-amber-800',
  beneficiary_disabler: 'bg-yellow-100 text-yellow-800',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function UserManagement() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState<any>({ email: '', full_name: '', role: 'viewer', groups: [], custom_permissions: '' });

  const { data: roleGroups = [] } = useQuery({ queryKey: ['roleGroups'], queryFn: () => userApi.getRoleGroups(), initialData: [] as any[] });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.list,
  });

  const inviteMut = useMutation({
    mutationFn: (body: any) =>
      userApi.invite({
        email: body.email,
        full_name: body.full_name,
        role: body.role,
        groups: body.groups,
        custom_permissions: typeof body.custom_permissions === 'string' && body.custom_permissions.trim().length > 0
          ? body.custom_permissions.split(',').map((p: string) => p.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      toast.success('User invited successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowInvite(false);
      setInviteForm({ email: '', full_name: '', role: 'viewer', groups: [], custom_permissions: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to invite user'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => userApi.updateRole(id, body),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update role'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? userApi.activate(id) : userApi.deactivate(id),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update status'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="mx-auto">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
        <div className="heading flex gap-2">
          {/* <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-700" />
          </div> */}
          <div>
            <h1>User Management</h1>
            <p>Invite, assign roles, and manage users</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 ">
          <div className="form-default-component relative bg-white p-6 rounded-lg w-full max-w-md">
          <button onClick={() => setShowInvite(false)} className="text-white hover:bg-[#03283F] transition-colors absolute top-3 right-3 bg-red-600 rounded-full p-1">
            <X className="w-4 h-4" />
          </button>
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              {/* <UserPlus className="w-5 h-5 text-purple-600" /> */}
              Invite New User
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMut.mutate(inviteForm);
              }}
              className="flex flex-col gap-4 overflow-y-auto max-h-[70vh]"
            >
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input-field focus:ring-0"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((p: any) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input-field focus:ring-0"
                  placeholder="John Smith"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm((p: any) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Role (legacy)</label>
                <select
                  className="input-field focus:ring-0"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((p: any) => ({ ...p, role: e.target.value }))}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Groups (optional)</label>
                <select
                  className="input-field focus:ring-0"
                  multiple
                  value={inviteForm.groups}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setInviteForm((p: any) => ({ ...p, groups: opts }));
                  }}
                >
                  {roleGroups.map((rg: any) => (
                    <option key={rg.id} value={rg.name}>{rg.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Custom Permissions (comma separated)</label>
                <input
                  type="text"
                  className="input-field focus:ring-0"
                  placeholder="approve_beneficiary,disable_beneficiary"
                  value={inviteForm.custom_permissions}
                  onChange={(e) => setInviteForm((p: any) => ({ ...p, custom_permissions: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-3">
                <button type="button" className="btn-secondary focus:ring-0" onClick={() => setShowInvite(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary focus:ring-0" disabled={inviteMut.isPending}>
                  {inviteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Heading */}
      <div className="flex items-center justify-between bg-[#326382] p-4 py-2 rounded-t-lg">
        <div className='heading'>
          <h2 className='text-white'>Role Permissions</h2>
        </div>
        <Link to="#" className="btn-primary flex items-center gap-2 text-sm px-6">
          View all
        </Link>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)] border border-[#D2E1E9] rounded-b-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className='text-left border-b border-gray-200 bg-[#EFF5FB]'>
              <th className="p-2 pl-4 font-medium text-[#5D6B74]">User</th>
              <th className="p-2 font-medium text-[#5D6B74]">Role</th>
              <th className="p-2 font-medium text-[#5D6B74] text-center">Status</th>
              <th className="p-2 font-medium text-[#5D6B74] text-center">Actions</th>
            </tr>
          </thead>
          <tbody >
            {users.map((user: any) => (
              <tr key={user.id} className="border-t border-[#D2E1E9]">
                <td className="p-2 pl-4 font-normal text-[#475259]">
                  <div className="flex">
                    <img src="../profile-small-icon.jpg" alt="Profile" className='rounded-full w-6 h-6 inline-block mr-2' />
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-2 font-normal text-[#475259]">
                    <select
                      className="input-field focus:ring-0"
                      multiple
                      value={user.groups || []}
                      onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                        roleMut.mutate({ id: user.id, body: { groups: opts } });
                      }}
                    >
                      {roleGroups.map((rg: any) => (
                        <option key={rg.id} value={rg.name}>
                          {rg.name}
                        </option>
                      ))}
                    </select>
                </td>
                <td className="p-2 font-normal text-[#475259] text-left">
                  <div className="flex items-center justify-center gap-1">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                    {!user.is_invited && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        Not Invited
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 font-normal text-[#475259] text-center">
                  {user.is_active ? (
                    <button
                      className="p-1.5 text-xs text-red-600 bg-red-50 rounded transition duration-colors hover:bg-red-100"
                      onClick={() => toggleActiveMut.mutate({ id: user.id, active: false })}
                      title='Deactivate'
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      className="p-1.5 text-xs text-green-600 bg-green-50 rounded transition duration-colors hover:bg-green-100"
                      onClick={() => toggleActiveMut.mutate({ id: user.id, active: true })}
                      title='Activate'
                    >
                      <UserRoundCheck className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  No users found. Invite your first user above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role Legend */}
      <div className="mt-6 p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)] border border-[#D2E1E9] rounded-lg">
        <h2 className="mb-3">
          Role Permissions Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-start gap-2">
              <span className={clsx('text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap', roleBadge[r.value])}>
                {r.label}
              </span>
              <span className="text-gray-500">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role Groups (dynamic) */}
      <div className="mt-6 p-4 bg-white shadow-[0_4px_16px_0_rgba(205,211,223,0.25)] border border-[#D2E1E9] rounded-lg">
        <RoleGroupsSection roleGroups={roleGroups} onCreated={() => { qc.invalidateQueries({ queryKey: ['roleGroups'] }); qc.invalidateQueries({ queryKey: ['users'] }); }} />
      </div>
    </div>
  );
}


import PERMISSION_GROUPS from '../constants/permissions';
import { Link } from 'react-router-dom';

function RoleGroupsSection({ roleGroups, onCreated }: { roleGroups: any[]; onCreated: () => void }) {
  const [form, setForm] = useState<any>({ name: '', description: '', permissions: [] });
  const qc = useQueryClient();
  const createMut = useMutation({
    mutationFn: (b: any) => userApi.createRoleGroup({ name: b.name, description: b.description, permissions: b.permissions }),
    onSuccess: () => {
      toast.success('Role group created');
      setForm({ name: '', description: '', permissions: '' });
      qc.invalidateQueries({ queryKey: ['roleGroups'] });
      onCreated();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create role group'),
  });

  return (
    <div className='max-w-4xl'>
      <div className="mb-4 border-b border-[#F0F4F6] pb-4">
        <h2>Create Role Group</h2>
        <p className='text-sm text-[#5B5C5E]'>Create custom role-based groups and assign permissions.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 mb-4 form-default-component border-b border-[#F0F4F6] pb-4">
        <div className='grid grid-cols-2 gap-4 mb-4 border-b border-[#F0F4F6] pb-4'>
          <div>
            <label className="label">Name</label>
            <input className="input-field focus:ring-0" placeholder="Name" value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input-field focus:ring-0" placeholder="Description" value={form.description} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} />
          </div>
        </div>

        <div>
          <h2>Permissions</h2>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.group} className='flex flex-col'>

                <div className="bg-[#326382] p-4 py-2 rounded-t-lg">
                  <div className='heading'>
                    <h2 className='!text-white'>{g.group}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#D2E1E9] p-4 flex-1 rounded-b-lg">
                  {g.perms.map((perm) => (
                    <label key={perm.id} className="!flex items-center gap-2 text-sm !mb-0">
                      <input
                        type="checkbox"
                        className='inline-block !w-auto'
                        checked={form.permissions?.includes(perm.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((p: any) => {
                            const perms = new Set(p.permissions || []);
                            if (checked) perms.add(perm.id); else perms.delete(perm.id);
                            return { ...p, permissions: Array.from(perms) };
                          });
                        }}
                      />
                      <span className="text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary focus:ring-0" onClick={() => setForm({ name: '', description: '', permissions: [] })}>Reset</button>
          <button className="btn-primary focus:ring-0" onClick={() => createMut.mutate({ name: form.name, description: form.description, permissions: form.permissions })} disabled={!form.name || createMut.isPending}>
            Create Group
          </button>
        </div>

      </div>

      <div className="mt-6">
        <h4 className="font-medium mb-2">Existing Groups</h4>
        <div className="grid gap-2">
          {roleGroups.length === 0 && <div className="text-sm text-gray-500">No role groups created yet.</div>}
          {roleGroups.map((rg: any) => (
            <div key={rg.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{rg.name}</div>
                <div className="text-xs text-gray-500">{(rg.permissions || []).join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
