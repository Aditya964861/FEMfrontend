import { Routes, Route, Navigate } from 'react-router-dom';
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from '@azure/msal-react';
import { useCurrentUser } from './contexts/UserContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PaymentInstructionList from './pages/PaymentInstructionList';
import PaymentInstructionForm from './pages/PaymentInstructionForm';
import PaymentInstructionDetail from './pages/PaymentInstructionDetail';
import OutstandingSignatures from './pages/OutstandingSignatures';
import CompletedPage from './pages/CompletedPage';
import BeneficiaryManagement from './pages/BeneficiaryManagement';
import UserManagement from './pages/UserManagement';
import AuditTrail from './pages/AuditTrail';
import DocuSignConfig from './pages/DocuSignConfig';
import LoginPage from './pages/LoginPage';
import AccessDenied from './pages/AccessDenied';
import LoadingSpinner from './components/LoadingSpinner';

function AuthenticatedApp() {
  const { user, loading } = useCurrentUser();

  if (loading) return <LoadingSpinner />;

  // User authenticated via Entra ID but not invited
  if (user && !user.is_invited) return <AccessDenied />;

  // API unreachable — still show app (will get errors on API calls)
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="payment-instructions" element={<PaymentInstructionList />} />
        <Route path="payment-instructions/new" element={<PaymentInstructionForm />} />
        <Route path="payment-instructions/:id" element={<PaymentInstructionDetail />} />
        <Route path="outstanding-signatures" element={<OutstandingSignatures />} />
        <Route path="completed" element={<CompletedPage />} />
        <Route path="beneficiaries" element={<BeneficiaryManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="audit-trail" element={<AuditTrail />} />
        <Route path="docusign-config" element={<DocuSignConfig />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <>
      <UnauthenticatedTemplate>
        <LoginPage />
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <AuthenticatedApp />
      </AuthenticatedTemplate>
    </>
  );
}

export default App;
