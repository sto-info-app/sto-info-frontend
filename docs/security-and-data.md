# Security, rate limiting, and data retention

This doc summarises the security posture of the system and the rules we must follow (including published retention windows).

## Authentication and session security

Frontend implementation:

- Access and refresh tokens are stored in `localStorage`.
- The Angular JWT module attaches the access token to requests to the backend host.

Implications:

- XSS is the primary risk: if an attacker can run JS in the browser, they can read tokens.
- Treat any XSS as a full account compromise.

Practical mitigations (system-level):

- Prefer strong Content Security Policy (CSP) and strict script loading.
- Minimise inline scripts.
- Keep dependencies up to date.

### Content Security Policy (CSP)

Production CSP:

```
default-src 'self'; img-src 'self' data: blob: https://cdn.startrekonline.info cdn-cookieyes.com www.googletagmanager.com; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn-cookieyes.com https://www.googletagmanager.com https://cdn.logrocket.io https://cdn.lr-ingest.io https://cdn.lr-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://cdn.ingest-lr.com https://cdn.lr-intake.com https://cdn.intake-lr.com https://cdn.logr-ingest.com https://cdn.lrkt-in.com https://cdn.logr-in.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.gstatic.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'self'; child-src 'self' blob:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'; media-src 'self'; worker-src 'self' blob:; connect-src 'self' https://api.startrekonline.info https://cdn.startrekonline.info *.cookieyes.com cdn-cookieyes.com google-analytics.com *.google-analytics.com https://*.logrocket.io https://*.lr-ingest.io https://*.logrocket.com https://*.lr-in.com https://*.lr-in-prod.com https://*.lr-ingest.com https://*.ingest-lr.com https://*.lr-intake.com https://*.intake-lr.com https://*.logr-ingest.com https://*.lrkt-in.com https://*.logr-in.com https://static.cloudflareinsights.com;
```

Dev CSP:

```
default-src 'self'; img-src 'self' data: blob: https://cdn.startrekonline.info cdn-cookieyes.com www.googletagmanager.com; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn-cookieyes.com https://www.googletagmanager.com https://cdn.logrocket.io https://cdn.lr-ingest.io https://cdn.lr-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://cdn.ingest-lr.com https://cdn.lr-intake.com https://cdn.intake-lr.com https://cdn.logr-ingest.com https://cdn.lrkt-in.com https://cdn.logr-in.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.gstatic.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'self'; child-src 'self' blob:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'; media-src 'self'; worker-src 'self' blob:; connect-src 'self' https://dev-api.startrekonline.info https://cdn.startrekonline.info *.cookieyes.com cdn-cookieyes.com google-analytics.com *.google-analytics.com https://*.logrocket.io https://*.lr-ingest.io https://*.logrocket.com https://*.lr-in.com https://*.lr-in-prod.com https://*.lr-ingest.com https://*.ingest-lr.com https://*.lr-intake.com https://*.intake-lr.com https://*.logr-ingest.com https://*.lrkt-in.com https://*.logr-in.com https://static.cloudflareinsights.com;
```

Where this is configured:

- CSP is set on the **Render static site** for the frontend under the "Manage Headers" section.
- It is currently applied to `/*`.
- Admin/owner: single admin (Steve).

### Other security headers (frontend static site)

These headers are also configured in the same place (Render static site -> Manage Headers) and currently applied to `/*`:

- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Resource-Policy: cross-origin`

## Consent and analytics security

- Analytics and LogRocket are consent-gated.
- Nothing a person types, reads or sends reaches a telemetry provider (FC-038):
  - LogRocket masks every text and input, and drops every request's and
    response's body and credentials.
  - Sentry's Session Replay masks every text, input and picture.
  - Sentry errors carry no request body, query or cookies.
  - Sentry breadcrumbs keep where a request went, without its query.

See [src/app/shared/services/log-rocket.service.ts](../src/app/shared/services/log-rocket.service.ts)
and [src/app/shared/telemetry/sentry-privacy.ts](../src/app/shared/telemetry/sentry-privacy.ts).
The backend's side, including the audit trail, is its `docs/privacy-erasure.md`.

## Pictures

Every uploaded picture is private at Cloudflare and reachable only by an
address the API signs, for about a day, while the picture may be shown
(FC-040). The browser draws the addresses it is given and never builds one; a
picture that is revoked is replaced by the "photo unavailable" image. The
backend's side is its `docs/image-delivery.md`.

Site admins can rescan published pictures (FC-041). One found infected is taken
down, and its owner is told only that a picture failed a security check. Scan
Diagnostics shows what a rescan found by asset ID and code, never the picture,
its owner or a signature name. The backend's side is its
`docs/rescan-campaigns.md`.

## Site admin accountability

Every site-level admin action asks for a reason, which the server keeps with
the action in its site admin log (FC-039): role and permission changes,
disabling and restoring accounts, report decisions and content moderation. The
log is kept like the audit trail: 180 days, the IP address 90. Site admins read
it, with the other logs they act in and the retention runs, on the Security
Log page. The backend's side is its `docs/admin-audit.md`.

## Rate limiting

This repo does not implement rate limiting itself (frontend cannot enforce it reliably), instead Cloudflare (WAF/rate limiting rules) andNestJS (e.g. throttler guard) on the backend enforce rate limits.

## Data retention rules

Published retention windows are stated in the in-app privacy policy:

- IP address in login/audit records: retained for 90 days then deleted
- Account activity data (audit): retained for 180 days then deleted
- Automatically collected data: retained up to 12 months unless required for security/legal reasons
- Account and game data: retained while the account is active or as long as law requires

## User uploads

Published terms include:

- Max upload size: 3.5MB per file
- Prohibited content includes adult content and copyrighted material without rights

> TODO Document:

- Allowed file types
- Storage location (database vs object storage)
- Whether uploads are scanned
- Deletion/retention policy for uploaded files

## Proxies, headers, and client IP

Behind Cloudflare and Render, request metadata will be proxied.

Backend must make a deliberate choice for:

- Client IP source (`CF-Connecting-IP` vs `X-Forwarded-For`)
- Scheme (`X-Forwarded-Proto`)
- Whether IPv6 addresses are normalised or stored as-is

> TODO Document which headers are trusted and how they are validated to prevent spoofing.

## Secrets and configuration

- Frontend build uses env vars to generate `environment.ts`.
- Secrets should not live in this repo.

> TODO Document:

- Secret storage and rotation (Render env vars, Cloudflare secrets, etc.)
- How database credentials are managed
- Incident response steps for credential leakage
