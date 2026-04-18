import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../services/authConfig';

export default function LoginPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark login-page-component">
      <div className="rounded-xl w-full max-w-lg p-14 login-wrapper">
        <div className="flex flex-col items-center mb-8">
          <img src="/riverrock-logo.svg" alt="RiverRock" className="h-10 mb-6" />
          <h1 className="text-2xl font-semibold text-white tracking-wide">Fund Expenses Management</h1>
          <p className="text-base font-normal text-white mt-1 opacity-70">Payment Instruction Automation</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-brand-lime tra hover:bg-brand-green text-brand-dark font-semibold py-3 px-4 rounded-lg transition duration-300 ease-in-out"
        >
          {/* Microsoft logo */}
          <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-white mt-5 opacity-70 text-center font-light">
          Sign in using your organisation&apos;s Microsoft Entra ID account.
        </p>
      </div>
    </div>
  );
}
