/**
 * Fund Management — MSAL (Microsoft Entra ID) Configuration
 *
 * Configure Azure AD app registration values here.
 * These should be set via environment variables in .env:
 *   VITE_ENTRA_CLIENT_ID     – Application (client) ID from Azure AD app registration
 *   VITE_ENTRA_TENANT_ID     – Directory (tenant) ID
 *   VITE_ENTRA_REDIRECT_URI  – Redirect URI (if omitted the SPA will use current origin)
 */

import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';
// allow overriding at build time, otherwise default to whatever host is serving the SPA
const redirectUri =
  import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin;


if (!clientId) {
  console.warn(
    '[MSAL] VITE_ENTRA_CLIENT_ID is not set. Entra ID login will not work.',
  );
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message, containsPii) => {
        if (!containsPii) {
          console.debug(`[MSAL] ${message}`);
        }
      },
    },
  },
};

/**
 * Scopes required for calling your backend API.
 * The backend should expose an API scope like:
 *   api://<backend-client-id>/access_as_user
 *
 * For development, you can use the default Microsoft Graph scope
 * and just validate the token audience on the backend.
 */
export const loginRequest = {
  scopes: [
    `api://${clientId}/access_as_user`,
  ],
};

/**
 * Scopes for acquiring a token silently for API calls.
 */
export const tokenRequest = {
  scopes: [
    `api://${clientId}/access_as_user`,
  ],
};
