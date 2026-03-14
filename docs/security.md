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

| Override key       | Forced version | Scope                     | Notes                                                               |
| ------------------ | -------------- | ------------------------- | ------------------------------------------------------------------- |
| `eslint`           | `9.37.0`       | Global package resolution | Required for current lint toolchain peer compatibility.             |
| `minimatch@<3.1.4` | `3.1.5`        | Legacy `minimatch` range  | Prevents installation of vulnerable 3.x versions.                   |
| `tmp`              | `0.2.5`        | Global package resolution | Forces patched `tmp` release for legacy transitive ranges.          |
| `undici`           | `7.24.2`       | Global package resolution | Addresses high-severity `undici` advisories in transitive dev deps. |
| `flatted`          | `3.4.1`        | Global package resolution | Addresses high-severity `flatted` advisory in transitive dev deps.  |

## Removed overrides

The following overrides were removed because they are no longer required by the resolved dependency graph:

- `ajv@^8.0.0`
- `minimatch@>=10.0.0 <10.2.3`
- `@stryker-mutator/core -> minimatch`
- `express-rate-limit`
- `underscore`

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls minimatch tmp undici flatted eslint
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

Current expected audit state:

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: moderate-only findings in Lighthouse CI transitive dependencies (`@lhci/cli -> lighthouse -> puppeteer-core -> extract-zip -> yauzl`).
- `npm audit fix --force` proposes downgrading `@lhci/cli` to `0.12.0`, which is a breaking change and currently not accepted.

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
