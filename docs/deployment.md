# Deployment (Render + Cloudflare)

This doc focuses on the non-obvious deployment details and the sharp edges when running behind Render and Cloudflare.

## Environments

> TODO List the environments you actually run (e.g. dev/staging/prod) and their domains.

## Frontend deployment on Render

### Build and publish

This repo is deployed as a static site.

- Build command: `npm run build:render`
  - runs `npm run generate-env` to write [src/environments/environment.ts](../src/environments/environment.ts)
  - runs an Angular production build
- Output directory: `dist/sto-info-frontend` (see [angular.json](../angular.json))

> TODO Confirm the exact Render "Publish Directory" (Angular may output `browser/` inside `dist/sto-info-frontend`).

### Render environment variables

Render injects env vars into the build step.

See [docs/README.md](README.md) for the full list.

### SPA routing and static headers

The static host uses [static.json](../static.json):

- Rewrites all paths to `/index.html` for client-side routing.
- Sets explicit cache headers for favicon assets.

If you see unexpected 404s on deep links, check:

- Cloudflare rules for the domain (page rules / cache rules)
- Render static site rewrite behaviour
- That `static.json` is included in the built output (Angular copies `src/static.json` as an asset)

Security headers:

- Response headers for the frontend (including CSP, HSTS, COOP/CORP, etc.) are configured in the **Render static site** under "Manage Headers".
- This is independent of Cloudflare, although Cloudflare can also add/override headers if configured.

> TODO Capture which domains/environments have which header sets (prod vs dev) and keep them in sync.

## Cloudflare integration

### DNS and TLS

> TODO Document the Cloudflare zone, DNS records, and SSL/TLS mode.

### Caching

Non-obvious considerations:

- Cloudflare can cache HTML if misconfigured. For an SPA, you typically want:
  - `/index.html` not cached or cached very briefly
  - immutable hashed assets cached aggressively

> TODO Document the intended cache strategy and where it is configured (Cache Rules, Workers, etc.).

### Proxies, client IP, and IPv6

When the backend runs behind Cloudflare and Render, you will typically see a chain like:

- `CF-Connecting-IP` (single client IP chosen by Cloudflare)
- `X-Forwarded-For` (comma-separated list)
- `X-Forwarded-Proto` (http/https)

Implications for NestJS:

- You must configure Nest/Express to trust the proxy if you want correct client IPs and scheme.
- If you use IP-based rate limiting or audit logging, decide which header is authoritative.

> TODO Confirm which headers are present in production and what the backend uses.

### Workers

A Cloudflare Worker is used for testing to set `stoi_no_analytics=1`.

> TODO Document:

- Worker name
- Deployment process
- Which routes it applies to
- How to disable/remove it

## Deployments and rollbacks (practical)

- Render builds are reproducible as long as environment variables and Node version remain stable.
- The frontend fails fast if required environment keys are missing.

If a deployment breaks:

- Roll back by redeploying the last known-good Render build.
- If the issue is CDN caching, purge Cloudflare cache and verify response headers.

> TODO Add the actual rollback procedure you use (Render UI vs API, who has access, etc.).
