# Security Automation

This project uses several automated tools to maintain a high security standard and identify potential vulnerabilities early in the development lifecycle.

## OpenSSF Scorecard

The [OpenSSF Scorecard](https://scorecard.dev/) automatically assesses the repository against security best practices.

- **Findings**: Viewable in **Security -> Code scanning alerts**.
- **Execution**: Runs weekly and on pushes to the `development` branch.
- **Badge**: Displayed in the `README.md`, linking to the full viewer.

## Snyk

Snyk is used to scan dependencies and source code for known vulnerabilities.

- **Scans**: Monitors `package.json` for vulnerable dependencies and performs Static Analysis (SAST) on code.
- **Findings**: Results appear in the Snyk dashboard and as checks on Pull Requests.
- **Blocking**: Critical or "High" severity vulnerabilities with a known fix will block the PR check.
- **Remediation**:
  - Follow the link in the GitHub check to see the specific vulnerable package.
  - Snyk typically suggests a minimal version upgrade to resolve the issue.
  - Update your `package.json` and run `npm install` (or `npm ci`) to update the lockfile.

## SonarCloud

SonarCloud performs deep code analysis, focusing on Security Hotspots and vulnerabilities.

- **Security Hotspots**: Highlights code areas that require manual review (e.g., sensitive configuration, cryptographic usage).
- **Findings**: Results are linked from PR checks to the SonarCloud dashboard.
- **Rules**: We enforce a set of security-specific rules (e.g., preventing hardcoded secrets) to catch common errors.
- **Remediation**: Review the 'Vulnerabilities' tab in SonarCloud. High-risk issues must be fixed or marked as 'Safe' by a maintainer before the Quality Gate passes.

## CodeQL Static Analysis

CodeQL is GitHub's industry-leading semantic analysis engine that treats code as data to find security vulnerabilities.

- **Findings**: Viewable in **Security -> Code scanning alerts**.
- **Execution**: Runs on every Pull Request to `development`, on pushes to `development` and `production`, and weekly.
- **Suites**: We use `security-extended` and `security-and-quality` for comprehensive coverage.

## GitHub Code Scanning (SARIF)

We use the SARIF (Static Analysis Results Interchange Format) to integrate various security tools into the GitHub interface.

- **Integration**: Tools like OpenSSF Scorecard upload findings in SARIF format.
- **Visibility**: All integrated findings appear under the **Security** tab in the GitHub repository.

## Feedback and Results

- Most security tools run on every Pull Request to the `development` branch.
- Critical vulnerabilities may block merges if the relevant quality gates are not met.
