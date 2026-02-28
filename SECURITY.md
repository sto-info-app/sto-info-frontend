# Security Policy

This document outlines the security policy for the `sto-info-frontend` repository.

## Supported Versions

We provide security updates for the following versions:

| Version             | Supported          |
| :------------------ | :----------------- |
| development         | :white_check_mark: |
| production releases | :white_check_mark: |

Please ensure you are using the latest tagged release or the `development` branch for the most secure experience.

## Automated Security Testing

Automated security testing is performed on every pull request and on a regular schedule.

### Static Analysis Security Testing (SAST)

**Tool:** [GitHub CodeQL](https://codeql.github.com/)

- **What it does**: Scans the source code for common vulnerabilities, security hotspots, and coding errors using data flow analysis.
- **When it runs**:
  - On every push to `development` and `production`.
  - On pull requests targeting `development` or `production` (smart skips if no code changes).
  - Weekly full scan for deep analysis.

### Dependency Auditing

**Tool:** `npm audit`

- **What it does**: Checks the dependency tree for known vulnerabilities in third-party packages.
- **When it runs**:
  - On pull requests that modify `package.json` or `package-lock.json`.
  - Weekly on a schedule to catch newly discovered vulnerabilities.
- **Action**: Fails the build if "High" or "Critical" vulnerabilities are found in production dependencies.

### Property-based fuzz testing with fast-check

**What it does:**
Property-based fuzz testing generates thousands of random inputs to test code behaviour under unexpected conditions. This helps identify edge cases, crashes, and unhandled exceptions.

**When it runs:**

- **Pull requests**: Lightweight tests (~50 iterations per property) to provide fast feedback
- **Weekly schedule**: Comprehensive tests (~1000 iterations per property) for deep analysis
- **Manual trigger**: Available via workflow_dispatch with configurable iteration counts

**How to run locally:**

```bash
# Lightweight (fast feedback)
npm run test:fuzz

# Comprehensive (deep analysis)
npm run test:fuzz:full

# Custom iteration count
FUZZ_NUM_RUNS=500 npm run test:fuzz
```

**Current test coverage:**

- URL parsing and query parameter handling
- Environment configuration validation
- String manipulation utilities

### OWASP ZAP DAST scanning

**What it does:**
ZAP (Zed Attack Proxy) performs Dynamic Application Security Testing by actively scanning the running application for common web vulnerabilities.

**When it runs:**

- **Pull requests**: ZAP baseline scan against a **local build** (fast feedback on code changes).
- **Environment updates (Push)**: ZAP baseline scan against the **deployed site** (Development or Production) after a version bump. Uses a smart polling loop for up to 10 minutes to wait for the new version to be live.
- **Weekly schedule**: ZAP full scan against the development site for deep analysis.
- **Manual trigger**: Baseline or full scans can be triggered manually via `workflow_dispatch`.

**Scan execution details:**

- **Local scans**: Application built and served via `npx serve` on `localhost:4202`.
- **Remote scans**: Performed against `dev.startrekonline.info` or `startrekonline.info`.
- **WAF Bypass**: Scans use a custom `User-Agent` to bypass edge protection and WAF blocking.
- **Artifacts**: Reports stored as workflow artifacts for 30 days.

**Failure criteria:**

- Scan fails on Medium or High severity findings
- Low and Informational findings logged but do not fail the build

**Limitations:**

- **Authentication**: Scans run against unauthenticated endpoints only; authenticated user flows are not currently tested
- **Coverage**: Full scan uses automated spider which may not discover all routes; consider adding authenticated scan contexts in future
- **False positives**: Some findings may be false positives; tune via `.zap/rules.tsv`

**Tuning false positives:**

Edit `.zap/rules.tsv` to suppress known false positives:

```tsv
# Format: <scanId>	<action>	<url>
10202	IGNORE	https://example.com/known-safe-endpoint
```

Common scan IDs are documented in `.zap/rules.tsv`.

**How to interpret results:**

1. Download ZAP report artifact from workflow run
2. Open `index.html` in browser
3. Review findings by severity
4. Investigate Medium/High findings first
5. Add legitimate false positives to `.zap/rules.tsv`

### Continuous updates

Both fast-check and ZAP are updated regularly via Dependabot to ensure the latest vulnerability signatures and testing capabilities.

## Reporting a Vulnerability

If you discover a potential security vulnerability, please report it privately. Do **not** create public issues for security-related findings.

### How to Report

- Email: `support@startrekonline.info`
- Please provide a detailed summary of the vulnerability, including steps to reproduce.

### What Not to Include

- Do not include any Personal Identifiable Information (PII) or secrets in your report.
- Do not post details of the vulnerability in public GitHub issues or discussions.

### Response Expectations

- We aim to acknowledge your report within 48 to 72 hours.
- We will provide a timeline for a fix if the vulnerability is confirmed.
- We appreciate your patience and cooperation in protecting the project.
