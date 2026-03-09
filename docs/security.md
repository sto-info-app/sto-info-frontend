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

| Override key                         | Forced version | Scope                                       | Notes                                                             |
| ------------------------------------ | -------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `eslint`                             | `9.37.0`       | Global package resolution                   | Keeps the linting toolchain on a known version.                   |
| `ajv@^8.0.0`                         | `8.18.0`       | Any dependency requesting `ajv` in `^8.0.0` | Pins to a specific release across the tree.                       |
| `minimatch@<3.1.4`                   | `3.1.5`        | Legacy `minimatch` range                    | Prevents installation of older vulnerable versions in this range. |
| `minimatch@>=10.0.0 <10.2.3`         | `10.2.4`       | Newer `minimatch` range                     | Prevents installation of vulnerable pre-`10.2.4` versions.        |
| `@stryker-mutator/core -> minimatch` | `10.2.4`       | Nested override for `@stryker-mutator/core` | Ensures Stryker uses the same safe `minimatch` version.           |
| `tmp`                                | `0.2.5`        | Global package resolution                   | Forces patched `tmp` release where transitive ranges are broad.   |
| `express-rate-limit`                 | `^8.2.2`       | Global package resolution                   | Enforces minimum secure major/minor line for rate-limit package.  |
| `underscore`                         | `^1.13.8`      | Global package resolution                   | Enforces patched line for known historical vulnerability classes. |

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls minimatch ajv tmp express-rate-limit underscore eslint
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed.

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
