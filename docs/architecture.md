# Architecture

This doc describes how the production system is structured and how requests flow through it.

## Components

- Angular SPA (this repo)
  - Renders the UI
  - Manages auth state client-side
  - Calls the backend API at `environment.apiUrl`
- NestJS API (separate repo)
  - Implements `/auth`, `/user`, `/health`, and domain endpoints
  - Talks to PostgreSQL
- PostgreSQL
  - Stores user accounts, STO entities, audit records, and other domain data
- Render.com
  - Hosts the frontend static site
  - Hosts the backend service(s)
  - Hosts PostgreSQL (or connects to an external Postgres provider)
- Cloudflare
  - DNS, TLS termination, edge caching
  - Optional WAF / rate limiting
  - Optional Workers (one is used for testing analytics)

PostgreSQL hosting:

- Render hosts the dev and prod PostgreSQL databases.
- Local development and other environments can use any hosted PostgreSQL provider.

## Request flow (typical)

### Frontend navigation and API-required routes

- The SPA is served via Cloudflare -> Render.
- Client-side routes are handled by Angular.
- For routes marked `requiresApi: true`, the frontend checks `/health/ready`.

Non-obvious behaviour:

- Health checks are used to control UI warnings, not to block navigation.
- Polling is only active while on API-required routes.

See:

- [src/app/core/health/api-required.guard.ts](../src/app/core/health/api-required.guard.ts)
- [src/app/core/health/health.service.ts](../src/app/core/health/health.service.ts)
- [src/app/template/main-content/main-content.component.ts](../src/app/template/main-content/main-content.component.ts)

### Authentication

- Access and refresh tokens are stored in `localStorage`.
- Token refresh occurs:
  - proactively (timer)
  - opportunistically on route navigation (guard)
- The Angular JWT module is configured to attach tokens to requests to the backend host.

See:

- [src/main.ts](../src/main.ts)
- [src/app/core/auth/auth.service.ts](../src/app/core/auth/auth.service.ts)

> TODO Document backend auth scheme (JWT claims, refresh token model, cookie usage).

## Environment configuration

### Build-time environment injection

Deployments use token replacement rather than Angular environment file replacements.

- [src/environments/environment.template.ts](../src/environments/environment.template.ts)
- [src/environments/inject-env-vars.js](../src/environments/inject-env-vars.js)

Runtime validation:

- The app throws on missing/undefined environment keys at startup.
- This catches missing Render env vars early.

See [src/environments/environment.service.ts](../src/environments/environment.service.ts).

## External services and data flows

### Consent-gated analytics

- CookieYes script is loaded dynamically.
- Google Analytics is loaded with tracking disabled, then enabled if consent is present.
- Sentry captures errors and session replays (sample rate controlled by config).
- LogRocket is initialised only when analytics consent is granted.
- A Cloudflare Worker can force-disable analytics via the `stoi_no_analytics=1` cookie.

See:

- [src/app/app.component.ts](../src/app/app.component.ts)
- [src/app/shared/services/script-loader.service.ts](../src/app/shared/services/script-loader.service.ts)
- [src/app/shared/services/log-rocket.service.ts](../src/app/shared/services/log-rocket.service.ts)

### Audit and retention

Published retention rules exist in the in-app privacy policy.

> TODO Confirm the backend implementation matches the published retention policy and describe how deletion is enforced (jobs, SQL, soft delete, partitioning, etc.).
