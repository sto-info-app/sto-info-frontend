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

| Override key                 | Forced version | Scope                  | Notes                                                                                                                                                                       |
| ---------------------------- | -------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@babel/core`                | `7.29.7`       | Global                 | `@angular/build` and test toolchain consumers resolved `@babel/core@7.29.0` (GHSA-4x5r-pxfx-6jf8). Override forces patched release.                                      |
| `basic-ftp`                  | `5.3.1`        | Global                 | `@lhci/cli` → `get-uri` → `basic-ftp@<=5.3.0` (GHSA-rpmf-866q-6p89). 5.3.1 is the patched release.                                                                          |
| `esbuild`                    | `0.28.1`       | Global                 | `vite` in the Angular build chain could resolve `0.27.x` on Windows (GHSA-g7r4-m6w7-qqqr). Override keeps all consumers on the patched release.                          |
| `js-yaml`                    | `4.2.0`        | Global                 | Multiple tooling chains (`@lhci/utils`, lint/reporting deps) previously resolved `<=4.1.1` (GHSA-h67p-54hq-rp68). Override forces patched release.                        |
| `piscina`                    | `5.2.0`        | Global                 | `@angular/build` pinned `piscina@5.1.4` (GHSA-x9g3-xrwr-cwfg). Override forces the patched non-vulnerable release.                                                        |
| `qs`                         | `6.15.2`       | Global                 | `@lhci/cli` → `express` / `body-parser` → `qs@6.15.1` (GHSA-q8mj-m7cp-5q26). 6.15.2 is the patched release.                                                                 |
| `tmp`                        | `0.2.7`        | Global                 | `@lhci/cli` (via `inquirer` / `external-editor`) resolves `tmp` through legacy ranges; override keeps the tree on the current patched release.                            |
| `undici`                     | `7.28.0`       | Global                 | `jsdom` and other consumers previously resolved versions in the vulnerable `7.0.0 - 7.27.x` range. Override forces the patched release family.                             |
| `uuid`                       | `14.0.0`       | Global                 | `@lhci/cli` uses `uuid@^8.3.1`, while `jest-junit` already requests `^14.0.0`; override standardizes the tree on the patched major release.                                 |
| `ws`                         | `8.21.0`       | Global                 | `lighthouse`, `puppeteer-core`, and jsdom-related chains resolved `8.20.1` (GHSA-96hv-2xvq-fx4p). Override forces patched `8.21.0`.                                        |
| `picomatch`                  | `4.0.4`        | Global                 | Multiple consumers (`@angular/build`, Jest internals, `http-proxy-middleware`) resolve through `picomatch`; override keeps all v4-branch consumers on `4.0.4`.            |
| `brace-expansion`            | `5.0.6`        | Global                 | Multiple packages (Jest, ESLint, `@lhci/cli`, `serve`) pull in `brace-expansion@<5.0.6` (GHSA-jxxr-4gwj-5jf2). 5.0.6 contains the fix.                                      |
| `express` → `path-to-regexp` | `0.1.13`       | Nested under `express` | `@lhci/cli` → `express@4` → `path-to-regexp@0.1.12` (GHSA-37ch-88jc-xwx2, GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7). 0.1.13 is the patched release.                         |
| `router` → `path-to-regexp`  | `8.4.2`        | Nested under `router`  | `@angular/cli` → `@modelcontextprotocol/sdk` → `express@5` → `router` → `path-to-regexp@8.3.0` (same CVEs). 8.4.2 is the patched release.                                   |

## Removed overrides

The following overrides were removed because they are no longer required:

- **2026-03-21**: `flatted: 3.4.1` — Removed; the pin was itself in the vulnerable range (GHSA-rf6f-7fwh-wjgh, prototype pollution in `<=3.4.1`). `flat-cache`'s `^3.2.9` constraint now naturally resolves to `3.4.2` which contains the fix.
- **2026-03-17**: `eslint: 9.37.0` — Upgraded to eslint@^10.0.3. Peer-dependencies are now properly resolved in v10.x.
- **2026-03-17**: `minimatch@<3.1.4` — No longer needed; eslint v10.x and other dependencies now resolve properly.
- **2026-05-27**: `handlebars`, `lodash`, `lodash-es`, `yaml` — Upstream dependency ranges now resolve to patched releases without an override.

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls @babel/core esbuild js-yaml piscina tmp undici ws picomatch brace-expansion path-to-regexp
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

Current expected audit state:

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `0 vulnerabilities`.
- The active overrides now only cover dependencies that still need forced versions.

Note on `path-to-regexp`: two separate major versions are in the tree. The overrides use a nested form (`express → path-to-regexp` and `router → path-to-regexp`) rather than a single global pin, because the 0.x and 8.x APIs are not interchangeable. The `serve-handler` copy at 3.x is not in a vulnerable range and is left unaffected.

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
