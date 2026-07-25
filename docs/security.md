# Security overrides

This document explains the dependency overrides currently in use in this repository.

Source of truth: `package.json` `overrides` section.

## Why overrides are used

Overrides force safe dependency versions when a vulnerable or undesired version would otherwise be selected by the dependency tree.

Use overrides when:

- A transitive dependency range allows a vulnerable version.
- Upstream packages have not yet updated their dependency constraints.
- We need consistent dependency resolution across local, CI, and release builds.

## Active overrides

| Override key        | Forced version | Scope  | Notes                                                                                                                                                                       |
| ------------------- | -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hono/node-server` | `2.0.11`       | Global | `@angular/cli` pulls `@modelcontextprotocol/sdk`, which depends on `@hono/node-server@^1.19.9` and triggers GHSA-frvp-7c67-39w9 on Windows (`serve-static` path traversal). |
| `brace-expansion`   | `5.0.8`        | Global | Multiple packages (Jest, ESLint, `@lhci/cli`, `serve`) pull in vulnerable `brace-expansion` ranges (GHSA-mh99-v99m-4gvg — unbounded expansion DoS). 5.0.8 contains the fix. |
| `esbuild`           | `0.28.1`       | Global | `vite` in the Angular build chain could resolve `0.27.x`–`0.28.0` on Windows (GHSA-g7r4-m6w7-qqqr — arbitrary file read via dev server). Override forces patched release.   |
| `js-yaml`           | `4.3.0`        | Global | Tooling chains (`@lhci/utils`, lint/reporting deps) resolve `4.0.0 - 4.2.0` (GHSA-52cp-r559-cp3m — quadratic-CPU merge-key DoS). 4.3.0 is the patched v4 release.           |
| `qs`                | `6.15.2`       | Global | `@lhci/cli` → `express` / `body-parser` → `qs@6.15.1` (GHSA-q8mj-m7cp-5q26). 6.15.2 is the patched release.                                                                 |
| `tmp`               | `0.2.7`        | Global | `@lhci/cli` (via `inquirer` / `external-editor`) resolves `tmp@<=0.2.5` (GHSA-ph9p-34f9-6g65 and the symlink-dir advisory). Override keeps the tree on the patched release. |
| `uuid`              | `14.0.0`       | Global | `@lhci/cli` uses `uuid@^8.3.1`, in the vulnerable `<11.1.1` range (GHSA-w5hq-g745-h8pq); override standardizes the tree on the patched major release.                       |

## Removed overrides

The following overrides were removed because they are no longer required:

- **2026-07-21**: `@babel/core`, `basic-ftp`, `piscina`, `undici`, `ws`, `picomatch`, `express → path-to-regexp`, `router → path-to-regexp` — Verified redundant by removing every override, reinstalling, and auditing: the tree now resolves all of these to non-vulnerable versions naturally, and `npm audit` stays at 0 with only the active overrides listed above restored. Build, lint, and the full test suite pass without them.
- **2026-05-27**: `handlebars`, `lodash`, `lodash-es`, `yaml` — Upstream dependency ranges now resolve to patched releases without an override.
- **2026-03-21**: `flatted: 3.4.1` — Removed; the pin was itself in the vulnerable range (GHSA-rf6f-7fwh-wjgh, prototype pollution in `<=3.4.1`). `flat-cache`'s `^3.2.9` constraint now naturally resolves to `3.4.2` which contains the fix.
- **2026-03-17**: `eslint: 9.37.0` — Upgraded to eslint@^10.0.3. Peer-dependencies are now properly resolved in v10.x.
- **2026-03-17**: `minimatch@<3.1.4` — No longer needed; eslint v10.x and other dependencies now resolve properly.

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls @hono/node-server brace-expansion esbuild js-yaml qs tmp uuid
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

Current expected audit state (last verified 2026-07-25):

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `0 vulnerabilities`.
- The active overrides now only cover dependencies that still need forced versions; removing any one of the seven is expected to reintroduce an advisory.

## Update process

1. Confirm the vulnerability or policy reason for a change.
2. Update `package.json` `overrides`.
3. Rebuild lockfile (`npm install`).
4. Run verification (`npm ls` and `npm audit`).
5. Run project checks (`npm run verify`).
6. Update this document with the new override entry and rationale.

## Ownership

- Security and dependency maintenance are handled through normal PR review.
- Any override addition or removal should be treated as a security-relevant change.
