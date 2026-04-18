/**
 * Fund Management — MSAL Instance
 *
 * Singleton MSAL PublicClientApplication instance.
 * Separated from main.tsx to avoid circular imports when used in api.ts.
 *
 * MSAL v3 requires `initialize()` to be awaited before calling any other API.
 * Call `await msalInitPromise` before rendering to ensure the instance is ready.
 */

import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig } from './authConfig';

export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Awaitable promise that resolves once the MSAL instance is fully initialized.
 * Import and await this in main.tsx before rendering the app.
 */
export const msalInitPromise = msalInstance.initialize().then(() => {
  // Default to first account if available
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for sign-in events and set active account
  msalInstance.addEventCallback((event) => {
    if (
      event.eventType === EventType.LOGIN_SUCCESS &&
      event.payload &&
      'account' in event.payload &&
      event.payload.account
    ) {
      msalInstance.setActiveAccount(event.payload.account);
    }
  });
});
