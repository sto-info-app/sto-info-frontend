# Operations runbook

This is the day-2 guide for debugging and operating the system.

## Quick commands (frontend)

- Start dev server: `npm start`
- Run unit tests: `npm test`
- Run coverage: `npm run test:cov`
- Run lint: `npm run lint`
- Production build (Render-like): `npm run build:render`

## Common incidents and how to debug them

### 1) "Service interruption" or backend warning shown in the UI

What is happening:

- The UI checks `/health/ready` and shows a warning when the backend is down.
- Any network error or 5xx from a backend request can mark the backend as down.

Where this logic lives:

- Guard: [src/app/core/health/api-required.guard.ts](../src/app/core/health/api-required.guard.ts)
- Polling: [src/app/core/health/health.service.ts](../src/app/core/health/health.service.ts)
- Interceptor: [src/app/core/health/api-health.interceptor.ts](../src/app/core/health/api-health.interceptor.ts)
- UI decision: [src/app/template/main-content/main-content.component.ts](../src/app/template/main-content/main-content.component.ts)

What to check:

- Is the backend returning 200 from `/health/ready`?
- Are there intermittent 5xx responses that could be tripping the interceptor?
- Is `API_URL` pointing at the correct backend base URL?

> TODO Add the backend health endpoints spec and expected response bodies.

### 2) App fails to start after deployment (blank page)

Most likely cause:

- Missing or invalid environment variables.

The app validates environment keys at startup and throws if any are `null`/`undefined`.

What to do:

- Check Render build logs and runtime logs.
- Confirm all required env vars are present in the Render environment.

See [src/environments/environment.service.ts](../src/environments/environment.service.ts).

### 3) Users are being logged out unexpectedly

Client-side session behaviour:

- Tokens and expiry timestamps are stored in `localStorage`.
- The client attempts to refresh 5 seconds before expiry.
- The route guard also refreshes when navigating to protected routes and the token is "expiring soon".

Things to check:

- Backend token expiry settings vs frontend timers (`MINS_BEFORE_LOGOUT_EXPIRY_TO_REFRESH_TOKEN`).
- Clock skew on client devices.
- Backend refresh behaviour (rotation/revocation).

See [src/app/core/auth/auth.service.ts](../src/app/core/auth/auth.service.ts).

> TODO Document the backend auth token expiry and refresh policy.

### 4) Analytics or session replay not working (or unexpectedly enabled)

Non-obvious behaviour:

- Analytics tooling is only loaded when `environment.env_name !== "local"`.
- CookieYes consent is required for "analytics" category.
- A Cloudflare Worker can force-disable analytics if `stoi_no_analytics=1`.

Where to look:

- Consent flow: [src/app/app.component.ts](../src/app/app.component.ts)
- Kill-switch cookie: [src/app/shared/services/script-loader.service.ts](../src/app/shared/services/script-loader.service.ts)

### 5) Profile picture upload issues

Known constraint from published terms:

- Uploaded files must not exceed 3.5MB.

> TODO Document backend file validation (mime types, resizing/cropping, storage location, virus scanning).
> TODO Document any Cloudflare/Render upload limits and timeouts.

## Running a production-like build locally

If you need to reproduce a "works locally but not on Render" issue:

- Set the same environment variables you use on Render.
- Run `npm run build:render`.
- Serve the output directory.

> TODO Confirm the correct directory to serve (often `dist/sto-info-frontend/browser`).

## Observability

Frontend has two main external observability paths:

- Google Analytics (consent-gated)
- LogRocket (consent-gated, with request body redaction for password-like fields)

> TODO Document backend observability (structured logs, request IDs, correlation IDs, error tracking, metrics).
