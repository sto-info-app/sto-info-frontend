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

| Override key      | Forced version | Scope                     | Notes                                                                                                                                                                    |
| ----------------- | -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tmp`             | `0.2.5`        | Global package resolution | Forces patched `tmp` release for legacy transitive ranges (`^0.1.0`, `^0.0.33`).                                                                                        |
| `undici`          | `7.24.5`       | Global package resolution | `@angular/build` pins `7.24.4` exactly; override ensures latest patch is used across all consumers.                                                                     |
| `picomatch`       | `4.0.4`        | Global package resolution | `http-proxy-middleware` → `micromatch@^4.0.8` → `picomatch@^2.3.1` which is vulnerable (GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p). Override forces the fixed 4.0.4 release. |
| `brace-expansion` | `5.0.5`        | Global package resolution | Multiple packages (Jest, ESLint, `@lhci/cli`, `serve`) pull in `brace-expansion@<5.0.5` (GHSA-f886-m6hf-6m8v). 5.0.5 contains the fix.                                |

## Removed overrides

The following overrides were removed because they are no longer required:

- **2026-03-21**: `flatted: 3.4.1` — Removed; the pin was itself in the vulnerable range (GHSA-rf6f-7fwh-wjgh, prototype pollution in `<=3.4.1`). `flat-cache`'s `^3.2.9` constraint now naturally resolves to `3.4.2` which contains the fix.
- **2026-03-17**: `eslint: 9.37.0` — Upgraded to eslint@^10.0.3. Peer-dependencies are now properly resolved in v10.x.
- **2026-03-17**: `minimatch@<3.1.4` — No longer needed; eslint v10.x and other dependencies now resolve properly.

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls tmp undici picomatch brace-expansion
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

Current expected audit state:

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `0 vulnerabilities` (confirmed as of 2026-04-06).
- All production and dev dependencies are vulnerability-free with current overrides in place.

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
