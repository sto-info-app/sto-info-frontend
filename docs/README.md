# STO Info Portal - Developer Guide

This is the primary onboarding document for the STO Info Portal.

Audience: future-me (6-12 months later) and new contributors.

## What you are looking at

This repository contains the **Angular frontend** for the portal.

The production system also includes:

- A **NestJS API** (referred to as "the backend" in this doc)
- A **PostgreSQL** database
- Hosting on **Render.com**
- Edge/CDN and security controls via **Cloudflare**

> TODO Link to the backend repository (NestJS) and any infra-as-code repo(s).

## System at a glance

- The frontend is a single-page application (SPA) built with Angular.
- The frontend calls the backend over HTTP using a configurable base URL.
- Auth is token-based (access + refresh token) and the app manages refresh and auto logout client-side.
- Availability is surfaced in the UI using health endpoints.
- Analytics/session replay are gated behind explicit consent.

Supporting docs:

- [Architecture](architecture.md)
- [Deployment (Render + Cloudflare)](deployment.md)
- [Operations runbook](operations.md)
- [Security, rate limiting, retention](security-and-data.md)
- [Memory leak prevention](memory-leak-prevention-guide.md)
- [GitHub Automation & Standards](github/README.md)

## Local development

### Prerequisites

- Node.js version compatible with [package.json](../package.json) engines (currently Node 24, support for Node 25 types)
- npm

### Install and run

- Install dependencies: `npm ci`
- Run locally: `npm start` (Angular dev server)
- Run tests: `npm test`
- Run lint: `npm run lint`
- Generate CI summary: `npm run summary:ci` (Parses latest local reports)

Default local URL: `http://localhost:4200/`

### Quality checks

Before committing changes, run the comprehensive quality check script:

```bash
npm run verify
```

For a comprehensive check (including performance and mutation testing), use:

```bash
npm run verify:full
```

This runs: `verify` (see below) + `lighthouse` (Performance/SEO) + `summary:ci` (Dashboard preview) + `mutation:incremental` (Test effectiveness).

### verify (Standard)

This runs all critical quality checks in sequence:

1. **Security audit** - `npm audit --audit-level=high --omit=dev`
   - Checks for high/critical vulnerabilities in production dependencies
   - Fails fast if critical security issues are found

2. **Linting** - `npm run lint`
   - ESLint checks for code quality and style issues
   - Ensures code follows project standards

3. **Unit tests with coverage** - `npm run test:cov`
   - Runs all unit tests with 100% coverage requirement
   - Generates coverage reports in `reports/coverage/`

4. **Fuzz testing** - `npm run test:fuzz`
   - Property-based fuzz tests (50 iterations)
   - Tests edge cases and unexpected inputs

5. **Build verification** - `npm run build`
   - Production build to ensure everything compiles
   - Catches build-time errors before pushing

The script stops at the first failure, allowing you to fix issues incrementally.

**Note on CI usage:**
In GitHub Actions, most of these checks use **Smart Skip** logic. If your PR only changes documentation or meta-files (like `.vscode/`), heavy jobs like builds and tests will be skipped automatically while still reporting a "Passed" status to satisfy branch protection rules.

**Intentionally excluded (run separately when needed):**

- Mutation testing: `npm run test:mutation` (very slow, 30+ minutes)
- Incremental Mutation testing: `npm run test:mutation:incremental` (fast, CI-standard)
- Lighthouse Audit: `npm run lighthouse` (Production build + Full audit)
- Full fuzz tests: `npm run test:fuzz:full` (1000 iterations)
- SonarQube analysis (CI-only, requires cloud service)
- OWASP ZAP DAST scans (CI-only, requires running server)

### Backend dependency

Most routes require a working backend.

- Default API URL is `http://localhost:3000` (see [src/environments/environment.ts](../src/environments/environment.ts)).
- The UI performs health checks against the backend and will show a warning state if the backend is down.

> TODO Document how to run the backend locally (NestJS commands, database setup, seed data, migrations).

### Font Awesome icons

This project uses **Font Awesome icons loaded via CDN** using standard HTML `<i>` tags.

Key details:

- Icons are loaded via **Font Awesome Kit** CDN script in `src/index.html`
- Kit URL: `https://kit.fontawesome.com/5812c6b103.js`
- **No npm packages required** - icons are globally available in the browser
- **No authentication needed** - locally or in CI/CD
- Icons are used via standard HTML `<i>` tags: `<i class="fas fa-icon-name"></i>`
- The kit is **domain-restricted** to startrekonline.info and its development domain for security

**Using icons:**

```html
<!-- Solid icons -->
<i class="fas fa-home"></i>

<!-- Regular icons -->
<i class="far fa-circle"></i>

<!-- Brands -->
<i class="fab fa-github"></i>

<!-- With custom classes -->
<i class="fas fa-external-link ext-link"></i>
```

**Benefits of this approach:**

- ✅ No npm authentication required
- ✅ Dependabot PRs can run full CI checks
- ✅ Simpler development setup
- ✅ Domain-restricted security
- ✅ Automatic updates when kit is updated

> Note: Icons are loaded asynchronously. Font Awesome automatically replaces `<i>` tags with SVG elements at runtime.

## Configuration and environment variables

### Important: environment values are generated at build time

Production builds do not rely on an Angular file replacement strategy.

Instead, the build pipeline runs a token replacement step:

- [src/environments/environment.template.ts](../src/environments/environment.template.ts) contains placeholder tokens.
- [src/environments/inject-env-vars.js](../src/environments/inject-env-vars.js) replaces tokens using `process.env` and writes [src/environments/environment.ts](../src/environments/environment.ts).
- The app then validates environment values at startup and throws an error if any are missing.

This is intentionally strict so a misconfigured deployment fails fast.

### Environment variables consumed by the build

These are read by [src/environments/inject-env-vars.js](../src/environments/inject-env-vars.js) (defaults shown are for local dev):

- `PRODUCTION` (default `false`)
- `ENV_NAME` (default `dev`)
- `ENV_LABEL` (default `Development`)
- `API_URL` (default `http://localhost:3000`)
- `APP_TITLE` (default `Star Trek Online Info Portal`)
- `APP_LOGGED_IN_HOME` (default `/dashboard`)
- `ALLOW_DEBUGGING` (default `false`)
- `MINS_BEFORE_LOGOUT_EXPIRY_TO_SHOW_WARNING` (default `5`)
- `MINS_BEFORE_LOGOUT_EXPIRY_TO_REFRESH_TOKEN` (default `15`)
- `COOKIE_YES_URL` (default empty)
- `GA_MEASUREMENT_ID` (default empty)
- `LOG_ROCKET_APP_ID` (default empty)
- `SENTRY_DSN` (default empty)

Notes:

- The app validates that **all** fields in the `Environment` model are present at boot via [src/environments/environment.service.ts](../src/environments/environment.service.ts).
- `logRocketAppId` is optional in the model, but the runtime behaviour expects it to be a string when enabled.

> TODO Document the exact environment values used in each Render environment (dev/prod).

## Frontend-to-backend integration

### Base URL and endpoint list

The frontend constructs endpoint URLs from `environment.apiUrl` in [src/app/shared/constants/api-routing.constants.ts](../src/app/shared/constants/api-routing.constants.ts).

Examples:

- Version: `/version`
- Health: `/health/ready` and `/health/live`
- Auth: `/auth/*`
- Profile updates (including profile picture): `/user/update-profile` and `/user/update-profile-pic`

### Health checks and "service interruption"

Non-obvious behaviour:

- A route can opt into backend availability checks by setting `data.requiresApi: true` in routing.
- For those routes, the app:
  - checks `/health/ready` on navigation (see [src/app/core/health/api-required.guard.ts](../src/app/core/health/api-required.guard.ts))
  - starts polling `/health/ready` while the user remains on API-required routes (see [src/app/template/main-content/main-content.component.ts](../src/app/template/main-content/main-content.component.ts))
- Any API call that fails with a network error or a 5xx response marks the backend state as down via an interceptor (see [src/app/core/health/api-health.interceptor.ts](../src/app/core/health/api-health.interceptor.ts)).

Operational implication: a transient 5xx can trigger an "API down" UI state even if the backend recovers quickly. Polling will bring it back to "up".

### Backend version display

The UI fetches `/version` and stores it as the backend app version, displayed alongside the frontend version (see [src/app/template/main-content/main-content.component.ts](../src/app/template/main-content/main-content.component.ts)).

> TODO Define what the backend returns at `/version` (format, caching, deployment provenance).

## Authentication and session lifecycle

Auth is implemented in [src/app/core/auth/auth.service.ts](../src/app/core/auth/auth.service.ts).

Key behaviours:

- `login()` uses `withCredentials: true` and stores:
  - `access_token` in `localStorage`
  - `refresh_token` in `localStorage`
  - `expires_at` and `warning_at` timestamps in `localStorage`
- Token refresh runs automatically:
  - on navigation to guarded routes if the token is expiring soon (see [src/app/core/auth/auth.guard.ts](../src/app/core/auth/auth.guard.ts))
  - via an internal timer that tries to refresh 5 seconds before expiry
- Auto logout warning:
  - a warning dialog is shown before expiry based on `MINS_BEFORE_LOGOUT_EXPIRY_TO_SHOW_WARNING`
  - user can choose to refresh their session
  - dialog automatically closes if the user logs out in another tab or session expires
  - implementation lives in [src/app/app.component.ts](../src/app/app.component.ts) and [src/app/shared/components/refresh-session-dialog](../src/app/shared/components/refresh-session-dialog)
- Logout handling:
  - Manual logout clears all active timers and dialogs
  - Attempts to revoke the refresh token on the backend (ignores 401 errors for already-expired tokens)
  - Preserves return URL when already on login page to avoid redirect loops
  - All cleanup is handled through `ngOnDestroy` hooks to prevent memory leaks

Memory leak prevention:

- All subscriptions use `takeUntil(destroy$)` pattern
- HTTP requests (including nested subscriptions) are properly managed
- Timers (`setTimeout`, `setInterval`) are explicitly cleared on component destruction
- See [Memory leak prevention guide](memory-leak-prevention-guide.md) for comprehensive patterns

Security note: access and refresh tokens are stored in `localStorage` which increases impact of any XSS. This is a deliberate trade-off here; see [Security, rate limiting, retention](security-and-data.md).

> TODO Document backend refresh token invalidation semantics (revocation strategy, rotation, reuse detection).

## Analytics, consent, and "kill switch" cookie

The app only loads analytics tooling outside local dev (`environment.env_name !== "local"`).

Consent system:

- Cookie consent is handled by CookieYes. The script URL is configured via `COOKIE_YES_URL` and loaded dynamically.
- Google Analytics is only enabled if the user has accepted the "analytics" category.
- Google Consent Mode defaults to denied and is updated after consent.

Non-obvious operational/testing feature:

- If a cookie named `stoi_no_analytics` is set to `1`, the frontend disables analytics regardless of consent.
- This cookie is intended to be set by a Cloudflare Worker for testing (see [src/app/shared/services/script-loader.service.ts](../src/app/shared/services/script-loader.service.ts)).

Session replay and error tracking:

- Sentry is used for error tracking and optional session replay.
- LogRocket is only initialised after analytics consent.
- Password-like fields in captured request bodies are redacted (see [src/app/shared/services/log-rocket.service.ts](../src/app/shared/services/log-rocket.service.ts)).
- Sentry captures errors automatically and is configured with session replays (sample rate depends on environment).
- Sentry replays also respect user privacy and redact sensitive data.

> TODO Document where the Cloudflare Worker lives and how it is deployed.

## Static hosting details

Render uses [static.json](../static.json) for SPA routing and caching headers.

Current behaviour:

- All requests are rewritten to `/index.html` (client-side routing).
- Cache headers are explicitly set for:
  - `/favicon.ico`
  - `/assets/favicons/*.png`

> TODO Confirm which other static assets are cached at the CDN edge and the desired cache policy.
