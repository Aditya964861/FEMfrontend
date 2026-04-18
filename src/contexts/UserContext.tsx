import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { authApi } from '../services/api';
import { userApi } from '../services/api';
import type { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refetch: () => void;
  hasPermission: (perm: string) => boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refetch: () => {},
  hasPermission: () => false,
});

// Mirror of backend ROLE_PERMISSIONS
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  admin: new Set([
    'manage_users', 'create_beneficiary', 'edit_beneficiary', 'approve_beneficiary',
    'delete_beneficiary', 'create_pi', 'edit_pi', 'delete_pi', 'generate_pi', 'view_pi',
    'upload_sharepoint', 'send_docusign', 'manage_templates', 'view_audit_logs',
    'upload_invoice', 'manage_docusign_config',
  ]),
  operator: new Set([
    'create_pi', 'edit_pi', 'delete_pi', 'generate_pi', 'view_pi', 'upload_sharepoint',
    'send_docusign', 'upload_invoice', 'view_audit_logs',
  ]),
  beneficiary_manager: new Set([
    'create_beneficiary', 'edit_beneficiary', 'view_beneficiary', 'view_audit_logs',
  ]),
  beneficiary_approver: new Set([
    'approve_beneficiary', 'view_beneficiary', 'view_audit_logs',
  ]),
  beneficiary_disabler: new Set([
    'disable_beneficiary', 'view_beneficiary', 'view_audit_logs',
  ]),
  viewer: new Set(), // Read-only — can view but no write permissions
};

export function UserProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [roleGroupsMap, setRoleGroupsMap] = useState<Record<string, Set<string>>>({});

  const fetchUser = async () => {
    try {
      const data = await authApi.getMe();
      setUser(data);
      try {
        const rgs = await userApi.getRoleGroups();
        const map: Record<string, Set<string>> = {};
        rgs.forEach((rg: any) => {
          map[rg.name] = new Set(rg.permissions || []);
        });
        setRoleGroupsMap(map);
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      // If 403 with "not been invited", create a stub user so AccessDenied renders
      if (err?.response?.status === 403 && err?.response?.data?.detail?.includes('not been invited')) {
        setUser({ id: '', email: '', full_name: '', is_active: true, is_admin: false, is_invited: false, role: 'viewer' } as any);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchUser();
    } else if (!isAuthenticated) {
      // In dev mode (no Entra ID configured), try fetching anyway
      // because the backend has a dev fallback that returns the first active user
      if (!hasFetched) {
        fetchUser();
      }
    }
  }, [isAuthenticated, hasFetched]);

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.is_admin || user.role === 'admin') return true;
    if (user.custom_permissions && user.custom_permissions.includes(perm)) return true;
    if (user.groups && user.groups.length > 0) {
      for (const g of user.groups) {
        if (roleGroupsMap[g] && roleGroupsMap[g].has(perm)) return true;
      }
    }
    return ROLE_PERMISSIONS[user.role]?.has(perm) ?? false;
  };

  return (
    <UserContext.Provider value={{ user, loading, refetch: fetchUser, hasPermission }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
