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

| Override key                | Forced version | Scope                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glob@>=9.0.0 <14.0.2`      | `^14.0.6`      | Vulnerable versions only | GHSA-3g3m-2fjr-6pw4 (moderate; an aborted glob walk keeps traversing the filesystem) covers every `glob` from `9.0.0` to `14.0.1` and was not backported. `test-exclude@7.0.2` (under `babel-plugin-istanbul`) asks for `glob@^10`, and `@jest/reporters`, `jest-config` and `jest-runtime` `30.5.2` for `glob@^13`. Added 2026-11-13. Dev tree only.                                                                                                                                   |
| `minimatch@>=7.0.0 <11.0.1` | `^11.0.8`      | Vulnerable versions only | GHSA-g3hv-75wg-m249 (moderate; denial of service through pattern-part amplification) covers `minimatch` `7.0.0` to `11.0.0` and was not backported to 9.x or 10.x. `eslint@10.14.0`, `@eslint/config-array`, `@typescript-eslint/typescript-estree@8.72.2`, `test-exclude` and `@stryker-mutator/core@10.1.1` all ask for `minimatch@^10`. `serve-handler` keeps its own `minimatch@3.1.5`, which is outside the advisory and outside the key's range. Added 2026-11-13. Dev tree only. |
| `qs`                        | `6.17.1`       | Global                   | `typed-rest-client@2.3.1`, which `@stryker-mutator/core@10.1.1` still pins, exact-pins `qs@6.15.1` (GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw; vulnerable up to `6.16.0`). `typed-rest-client@3` has moved to `qs@^6.16.0` on its own. Raised from `6.17.0` on 2026-11-13 to track the current release. Dev tree only.                                                                                                                         |

The `glob` and `minimatch` keys carry a version range, so each applies only to
copies inside its advisory. Once every consumer asks for a fixed release the
key matches nothing and can be deleted. Both move a dependency across a major
version from what its parent declared, so lint, the build, the full Jest suite
with coverage and the fuzz suite were run against them on 2026-11-13.

### Overrides removed on 2026-11-13

- `argparse` (`^2.0.1`) existed to drop `sprintf-js` from the tree for
  GHSA-hp3w-g68c-fv3c. GitHub withdrew that advisory on 2026-10-22. `js-yaml@3`
  (under `@istanbuljs/load-nyc-config`) is back on the `argparse@1` it
  declares, `sprintf-js@1.0.3` is installed again, and `npm audit` does not
  report it.
- `compression` (`1.8.2`): `serve@14.2.8` pins `compression@1.8.2` itself.
- `vite` (`8.3.5`): `@angular/build@22.2.7` pins `vite@8.3.5` itself.

Each was checked by deleting the entry, resolving the tree again and
re-running `npm audit`.

### Overrides removed with Lighthouse CI (2026-10-27)

`@lhci/cli@0.15.1` exact-pinned `lighthouse@12.6.1`, whose
`puppeteer-core@24` → `chromium-bidi@14` chain carries `zod@3`
(GHSA-mrhx-c7xc-m3w5, no `zod@3` fix). `@lhci/cli` had no release since June
2025, so it was replaced by `scripts/lighthouse-audit.mjs` driving
`lighthouse@13` directly. That removed the whole chain, and with it the
`@puppeteer/browsers`, `basic-ftp`, `tmp` and `uuid` overrides, which existed
only for it: `puppeteer-core@25` already depends on `@puppeteer/browsers@3`
(so `extract-zip` stays out of the tree), and `jest-junit` resolves a patched
`uuid@14` without help.

## Known advisory with no remediation

### `deepmerge` (GHSA-gcqx-w48m-w2h4) — dev tree only, no fixed release

`jest` → `jest-config@30.5.2` → `deepmerge@4.3.1` is flagged at **low**
severity for prototype poisoning of the object `mergeObject()` returns. The
advisory covers `4.2.0` to `4.3.1` and `4.3.1` is the newest release, so there
is nothing to pin to. Jest uses it to merge its own configuration, never
untrusted input, and `npm audit --omit=dev` does not see it. `npm audit`
counts it five times, once per package on its path.

**When it can be remediated**: when `deepmerge` publishes a fix. Check with:

```sh
npm view deepmerge@latest version
npm ls deepmerge
```

### `braces` (GHSA-vfj7-8cjw-p6xm) — dev tree only, no fixed release

`stylelint@17.16.0` → `micromatch@4.0.8` → `braces@3.0.3` is flagged at **high**
severity for stack exhaustion on deeply nested brace patterns. `3.0.3` is the
newest `braces` ever published and the advisory covers `<=3.0.3`, so there is
nothing to pin to and nothing to override; the audit's only suggestion is a
downgrade to `stylelint@7.7.0`. `braces` is reached only through Stylelint's
file globbing of the project's own `src/**/*.scss` patterns, never from
untrusted input, and `npm audit --omit=dev` does not see it. As of 2026-10-27
`npm audit` no longer reports it although `braces@3.0.3` is still installed
(still true on 2026-11-13), so re-check before deleting this note.

**When it can be remediated**: when `braces` publishes a fix or `micromatch`
drops it. Check with:

```sh
npm view braces@latest version
npm ls braces
```

## Pinned-by-upstream dependencies (not overrides)

These are not `overrides` entries, but they are the reason `npm outdated` shows a
newer `latest` that this project deliberately does not take.

### `typescript` stays on `~6.0.3` (re-checked 2026-11-13)

`typescript@7.0.2` is published, but it no longer ships the JavaScript compiler
API (only `unstable/*` entry points), and the tools that load that API all gate
on 6.x: `@angular/compiler-cli@22.2.6` and `typescript-eslint@8.72.2` declare
`>=6.0 <6.1` / `<6.1.0`, and `ts-jest@29.4.15` `<7`. Dependabot ignores
TypeScript majors for that reason (`.github/dependabot.yml`).

The code itself is ready: `tsc -p tsconfig.spec.json --noEmit` passes on
`typescript@7.0.2`, and the tsconfigs no longer need `ignoreDeprecations`
(`baseUrl` is gone; `src/*` is an explicit `paths` alias).

**When it can be retried**: when Angular, `typescript-eslint` and `ts-jest`
all declare a `typescript@7` peer range. Check with:

```sh
npm view @angular/compiler-cli@latest peerDependencies.typescript
npm view typescript-eslint@latest peerDependencies.typescript
npm view ts-jest@latest peerDependencies.typescript
```

### Unused dependencies removed (2026-09-03)

A dependency audit (`depcheck`, then a manual check of every candidate against
`src/`, the SCSS entry points, `angular.json`, the npm scripts, and every config
file) removed seventeen packages that nothing referenced. Each removal was
confirmed with `npm run lint`, `npm run lint:style`, `npm run build`,
`npm run test:cov`, and `npm run test:fuzz`.

**Runtime dependencies** — none of these were imported anywhere in `src/`, and
none appear in the SCSS entry points listed in `angular.json`:

| Removed                             | Note                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@angular/platform-browser-dynamic` | Deprecated by Angular. Not imported; `setup-jest.ts` bootstraps through `jest-preset-angular/setup-env/zone`. |
| `moment`                            | The 23 `grep` hits for "moment" in `src/` are all the English word in comments and message strings.           |
| `ngx-toastr`                        | No import and no stylesheet reference.                                                                        |
| `ngx-pagination`                    | No import.                                                                                                    |
| `lru-cache`                         | No import.                                                                                                    |
| `glob`                              | No import — the `glob` hits in `angular.json` are asset-glob keys, and those in `src/` are `globalThis`.      |
| `rimraf`                            | No import and not referenced by any npm script.                                                               |
| `http-proxy-middleware`             | No import; the project defines no `proxyConfig` in `angular.json`.                                            |
| `@eslint/config-array`              | Not referenced by `eslint.config.mjs`; leftover from an old transitive-deprecation workaround.                |
| `@eslint/object-schema`             | Same.                                                                                                         |

**Dev dependencies** — redundant because the meta-package already pins them at
the identical version:

| Removed                                  | Provided instead by                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `@angular-eslint/builder`                | `angular-eslint@22.2.0`, which depends on it at exactly `22.2.0`         |
| `@angular-eslint/eslint-plugin`          | `angular-eslint@22.2.0`                                                  |
| `@angular-eslint/eslint-plugin-template` | `angular-eslint@22.2.0`                                                  |
| `@angular-eslint/template-parser`        | `angular-eslint@22.2.0`                                                  |
| `@typescript-eslint/eslint-plugin`       | `typescript-eslint@8.69.0`, which depends on it at exactly `8.69.0`      |
| `@typescript-eslint/parser`              | `typescript-eslint@8.69.0`                                               |
| `@eslint/eslintrc`                       | Nothing — not imported by `eslint.config.mjs`, which is pure flat config |

**Verified against CI**: no workflow in `.github/` references any removed
package, and none of the removals touch a command the workflows run.

#### Kept despite being flagged

`depcheck` also flagged these; each was checked and **kept**:

| Package                                                               | Why it stays                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `jest-environment-jsdom`                                              | Required. Removing it fails every spec with `Test environment jest-environment-jsdom cannot be found` — Jest 28+ no longer ships it. |
| `tslib`                                                               | Required. `tsconfig.json` sets `"importHelpers": true`, so the compiler emits `tslib` imports.                                       |
| `@angular/build`                                                      | The builder for every target in `angular.json` (`@angular/build:application`).                                                       |
| `cross-env`                                                           | Used by five npm scripts.                                                                                                            |
| `stylelint-config-standard-scss`                                      | Extended by `.stylelintrc`.                                                                                                          |
| `@stryker-mutator/jest-runner`, `@stryker-mutator/typescript-checker` | Resolved by name from `stryker.config.json` (`testRunner: "jest"`, `checkers: ["typescript"]`).                                      |

### Dead Prettier option removed (2026-09-03)

`.prettierrc` carried `"arrayBracketSpacing": true`, which is not a Prettier
option (it is an ESLint rule name). Prettier logged
`Ignored unknown option { arrayBracketSpacing: true }` on every run, including
every format-on-save in VS Code. Removed here and from the backend, which had
the same key.

### `@angular/animations` — deprecated but not removable

`npm install` prints one Angular deprecation notice:

```
@angular/animations is deprecated. Use `animate.enter` and `animate.leave` instead.
```

The package is current (`22.1.4`, the `latest` tag) and **cannot** be dropped:
`@angular/platform-browser@22.1.4` depends on it, and the app imports through
that path — `provideAnimationsAsync` from `@angular/platform-browser/animations`
in [src/main.ts](../src/main.ts), plus `NoopAnimationsModule` /
`provideNoopAnimations` across the specs. Migrating to `animate.enter` /
`animate.leave` is an application change, not dependency maintenance.

`@angular/platform-browser-dynamic`, which carried the same kind of notice, _was_
unused and has been removed — see [Unused dependencies removed](#unused-dependencies-removed-2026-09-03).

## Removed overrides

The following overrides were removed because they are no longer required:

- **2026-11-13**: `argparse`, `compression`, `vite` — the `sprintf-js` advisory behind `argparse` was withdrawn, and `serve@14.2.8` and `@angular/build@22.2.7` now pin the patched `compression` and `vite` themselves. See [Overrides removed on 2026-11-13](#overrides-removed-on-2026-11-13).

- **2026-10-27**: `@puppeteer/browsers`, `basic-ftp`, `tmp`, `uuid` — removed with `@lhci/cli`. See [Overrides removed with Lighthouse CI](#overrides-removed-with-lighthouse-ci-2026-10-27).

- **2026-09-03**: `@hono/node-server` — `@angular/cli@22.1.7` now pulls `@modelcontextprotocol/sdk@1.30.0`, which resolves `@hono/node-server@2.0.11` on its own. Verified by deleting the entry, reinstalling, and confirming `npm ls @hono/node-server` still reports `2.0.11` with `npm audit` at 0.

- **2026-08-05**: `brace-expansion`, `esbuild`, `js-yaml` — Verified redundant by removing overrides, reinstalling, and re-running `npm audit` + `npm audit --omit=dev`. Both audits remain at 0 with these entries removed.

- **2026-07-21**: `@babel/core`, `basic-ftp`, `piscina`, `undici`, `ws`, `picomatch`, `express → path-to-regexp`, `router → path-to-regexp` — Verified redundant by removing every override, reinstalling, and auditing: the tree now resolves all of these to non-vulnerable versions naturally, and `npm audit` stays at 0 with only the active overrides listed above restored. Build, lint, and the full test suite pass without them.
- **2026-05-27**: `handlebars`, `lodash`, `lodash-es`, `yaml` — Upstream dependency ranges now resolve to patched releases without an override.
- **2026-03-21**: `flatted: 3.4.1` — Removed; the pin was itself in the vulnerable range (GHSA-rf6f-7fwh-wjgh, prototype pollution in `<=3.4.1`). `flat-cache`'s `^3.2.9` constraint now naturally resolves to `3.4.2` which contains the fix.
- **2026-03-17**: `eslint: 9.37.0` — Upgraded to eslint@^10.0.3. Peer-dependencies are now properly resolved in v10.x.
- **2026-03-17**: `minimatch@<3.1.4` — No longer needed; eslint v10.x and other dependencies now resolve properly.

## Verification

Use these commands to confirm overrides are applied:

```bash
npm ls glob minimatch qs compression vite
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed. No `glob` should be below `14.0.2` and no `minimatch` between `7.0.0` and `11.0.0`; `compression` should be `1.8.2` or later and `vite` `8.3.5` or later without an override.

Current expected audit state (last verified 2026-11-13):

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `5 low`, all of them the single `deepmerge` advisory reported once per package on its path (`deepmerge`, `jest-config`, `@jest/core`, `jest`, `jest-cli`). See [Known advisory with no remediation](#known-advisory-with-no-remediation).
- The active overrides only cover dependencies that still need forced versions; removing any one of the three reintroduces an advisory. This was re-confirmed on 2026-11-13 by removing each entry in turn and re-auditing.

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
