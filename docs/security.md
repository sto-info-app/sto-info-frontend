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

| Override key          | Forced version | Scope  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@puppeteer/browsers` | `3.2.1`        | Global | `@lhci/cli` → `lighthouse@12.6.1` → `puppeteer-core@24.43.1` → `@puppeteer/browsers@2.13.2` → `extract-zip` (GHSA-jmr9-qjv8-65gv, unvalidated symlink path traversal). **`extract-zip` has no patched release** — every published version is affected. `@puppeteer/browsers@3.x` drops `extract-zip` entirely in favour of `modern-tar`, so the override removes the package from the tree rather than pinning it. See the note below. |
| `qs`                  | `6.16.0`       | Global | `@lhci/cli` → `express@4.22.2` / `body-parser` → `qs@6.15.3` (GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g). The vulnerable range is `2.2.5 - 6.15.3`; `6.16.0` is the first release patched against all three. Also covers `typed-rest-client`.                                                                                                                                                                      |
| `tmp`                 | `0.2.7`        | Global | `@lhci/cli` (via `inquirer` / `external-editor`) resolves `tmp@<=0.2.5` (GHSA-ph9p-34f9-6g65 and GHSA-52f5-9888-hmc6). Override keeps the tree on the patched release.                                                                                                                                                                                                                                                                 |
| `uuid`                | `14.0.0`       | Global | `@lhci/cli` uses `uuid@^8.3.1`, in the vulnerable `<11.1.1` range (GHSA-w5hq-g745-h8pq); override standardizes the tree on the patched major release.                                                                                                                                                                                                                                                                                  |

### `@puppeteer/browsers` — why a major bump instead of a version pin

`extract-zip` is flagged at **high** severity with no fix available in any
release, so a pin cannot help. The three ways out were:

1. Override `lighthouse` to `13.4.1` — rejected. `@lhci/cli@0.15.1` exact-pins
   `lighthouse@12.6.1` and drives it programmatically; a major jump risks the
   Lighthouse CI job for a dev-only advisory.
2. Override `puppeteer-core` to `25.x` — rejected for the same reason, one level
   lower.
3. **Override `@puppeteer/browsers` to `3.2.1`** — chosen. It is the only package
   in the chain that actually depends on `extract-zip`, and version 3 replaced it
   with `modern-tar`.

Compatibility was checked rather than assumed. Every symbol
`puppeteer-core@24.43.1` imports from the package (`Browser`,
`ChromeReleaseChannel`, `TimeoutError`, `computeExecutablePath`,
`computeSystemExecutablePath`, `createProfile`, `detectBrowserPlatform`,
`getInstalledBrowsers`, `launch`, `resolveBuildId`, `uninstall`, and the CDP /
WebDriver endpoint regexes) is exported by `3.2.1`, and a real
`lhci collect` run against the production bundle completes successfully:

```sh
npm run build:prod
npx lhci collect --url=http://localhost:4201/ --numberOfRuns=1 --startServerCommand="serve -s dist/sto-info-frontend/browser -p 4201" --startServerReadyPattern="Accepting connections at"
```

**When it can be removed**: when `@lhci/cli` ships a `lighthouse` release whose
`puppeteer-core` already resolves `@puppeteer/browsers@>=3`. Check with:

```sh
npm view @lhci/cli@latest dependencies.lighthouse
npm ls extract-zip
```

## Pinned-by-upstream dependencies (not overrides)

These are not `overrides` entries, but they are the reason `npm outdated` shows a
newer `latest` that this project deliberately does not take.

### `typescript` stays on `~6.0.3` (re-checked 2026-09-03)

`typescript@7.0.2` is published, but `@angular/compiler-cli@22.1.4` declares
`peerDependencies.typescript` as `>=6.0 <6.1`. Angular's compiler is built
against a specific TypeScript minor, so this is a hard gate, not a caution.

**When it can be retried**: when an Angular release declares a `typescript@7`
peer range. Check with:

```sh
npm view @angular/compiler-cli@latest peerDependencies.typescript
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
npm ls @puppeteer/browsers extract-zip qs tmp uuid
npm audit --omit=dev
npm audit
```

If `npm ls` shows versions outside the table above, the lockfile may be stale or dependency constraints changed. `npm ls extract-zip` should report `(empty)`.

Current expected audit state (last verified 2026-09-03):

- `npm audit --omit=dev`: `0 vulnerabilities`.
- `npm audit`: `0 vulnerabilities`.
- The active overrides now only cover dependencies that still need forced versions; removing any one of the four is expected to reintroduce an advisory. This was re-confirmed on 2026-09-03 by removing each entry in turn and re-auditing.

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
