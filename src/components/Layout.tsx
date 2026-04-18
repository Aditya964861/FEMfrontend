import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  FileText,
  ClipboardCheck,
  LogOut,
  Users,
  History,
  Key,
  CreditCard,
  CheckSquare,
  Landmark,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMsal } from '@azure/msal-react';
import { useCurrentUser } from '../contexts/UserContext';
import { useState } from 'react';

export default function Layout() {
  const location = useLocation();
  const { instance } = useMsal();
  const { user, hasPermission } = useCurrentUser();


   const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: '/' });
  };

  // Build navigation items based on user permissions
  // GET endpoints don't require permissions — only write actions do
  const navigation = [
    { name: 'Payment Inputs', href: '/payment-instructions/new', icon: CreditCard, show: hasPermission('create_pi') },
    { name: 'View PI', href: '/payment-instructions', icon: FileText, show: true, exact: true },
    { name: 'Outstanding Signatures', href: '/outstanding-signatures', icon: ClipboardCheck, show: true },
    { name: 'Completed', href: '/completed', icon: CheckSquare, show: true },
    // 'Add Beneficiary' moved into the Beneficiary Management page as an inline modal
    { name: 'Manage Beneficiaries', href: '/beneficiaries', icon: Landmark, show: hasPermission('approve_beneficiary') || hasPermission('edit_beneficiary') },
    { name: 'User Management', href: '/users', icon: Users, show: hasPermission('manage_users') },
    { name: 'Audit Trail', href: '/audit-trail', icon: History, show: hasPermission('view_audit_logs') },
    { name: 'DocuSign Config', href: '/docusign-config', icon: Key, show: hasPermission('manage_docusign_config') },
  ].filter((item) => item.show);

  const roleBadge: Record<string, string> = {
    admin: 'bg-purple-600',
    operator: 'bg-blue-600',
    beneficiary_manager: 'bg-emerald-600',
    beneficiary_disabler: 'bg-yellow-600',
    beneficiary_approver: 'bg-amber-600',
    viewer: 'bg-gray-500',
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}

      <aside
        className={clsx(
          "bg-[#03283F] text-white flex flex-col transition-all duration-300 relative",
          collapsed ? "w-0 overflow-hidden" : "w-65"
        )}
      >

        {/* Logo */}
        <div className="p-6 border-none">
          <Link to="/" className="flex items-center gap-3">
            <img src="/riverrock-logo.svg" alt="RiverRock" className="w-32" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.exact
                ? location.pathname === item.href
                : (item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#0A3B59] text-brand-lime border-l-2 border-brand-lime'
                    : 'text-[#768C9A] hover:bg-[#0A3B59] hover:text-brand-lime ',
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer — User info + Logout */}
        <div className="p-4 space-y-3">
          {user && (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate w-[150px]">{user.full_name}</p>
                <p className="text-xs text-[#768C9A] truncate max-w-[150px]">{user.email}</p>
              </div>
              <span className={clsx('btn-primary !bg-brand-lime hover:text-black text-[10px] capitalize px-2 py-0.5 rounded-full', roleBadge[user.role] || roleBadge.viewer)}>
                {user.role.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#768C9A] hover:text-brand-lime transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 relative">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-primary rounded-none rounded-r-full p-1 z-10 absolute left-0 top-2"
        >
          <ChevronRight
            className={clsx(
              "w-4 h-4 transition-transform duration-300 ease-in-out",
              collapsed && "rotate-180"
            )}
          />
        </button>
        <div className="p-8 max-w-7xl mx-auto min-h-[94vh]">
          <Outlet />

        </div>
        <footer className="px-8 py-4 bg-white text-sm text-[#80868E]">
          <div className="max-w-7xl mx-auto">
              <div className="copyright">© 2026 RiverRock European Capital Partners.</div>
           </div>
        </footer>
      </main>
    </div>
  );
}
