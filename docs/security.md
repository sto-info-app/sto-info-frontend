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

| Override key | Forced version | Scope                     | Notes                                                               |
| ------------ | -------------- | ------------------------- | ------------------------------------------------------------------- |
| `tmp`        | `0.2.5`        | Global package resolution | Forces patched `tmp` release for legacy transitive ranges.          |
| `undici`     | `7.24.2`       | Global package resolution | Addresses high-severity `undici` advisories in transitive dev deps. |
| `flatted`    | `3.4.1`        | Global package resolution | Addresses high-severity `flatted` advisory in transitive dev deps.  |

## Removed overrides

The following overrides were removed because they are no longer required:

- **2026-03-17**: `eslint: 9.37.0` — Upgraded to eslint@^10.0.3. Peer-dependencies are now properly resolved in v10.x.
- **2026-03-17**: `minimatch@<3.1.4` — No longer needed; eslint v10.x and other dependencies now resolve properly.

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls tmp undici flatted
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

Current expected audit state:

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `0 vulnerabilities` (confirmed as of March 2026).
- All production dependencies are vulnerability-free with current overrides in place.

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
