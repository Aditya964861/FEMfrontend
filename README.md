# FEMFrontend
RR FEM

## Configuration

The frontend uses Vite environment variables (must be prefixed with `VITE_`).

- `VITE_ENTRA_CLIENT_ID` – Azure AD application (client) ID
- `VITE_ENTRA_TENANT_ID` – Azure AD tenant ID
- `VITE_ENTRA_REDIRECT_URI` – Redirect URI used for OAuth; if omitted it will
  automatically use `window.location.origin`, allowing the same build to work
  on `localhost` and the production host.
- `VITE_API_BASE_URL` – Base URL for the backend API. This defaults to
  `http://localhost:4883/api/v1` when running locally, and
  `https://feapi.riverrock.eu/api/v1` in production. Override to target a
  different backend.

The development server defaults to port 4884, and will call the backend at
`localhost:4883` unless `VITE_API_BASE_URL` is set.

Register both `http://localhost:4884` and `https://funds.riverrock.eu/` as
redirect URIs in your Azure AD app registration (SPA type).
