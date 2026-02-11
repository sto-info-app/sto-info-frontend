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
- **Remediation**: Snyk provides guidance on upgrading packages or patching code to fix identified issues.

## SonarCloud

SonarCloud performs deep code analysis, focusing on Security Hotspots and vulnerabilities.

- **Security Hotspots**: Highlights code areas that require manual review (e.g., sensitive configuration, cryptographic usage).
- **Findings**: Results are linked from PR checks to the SonarCloud dashboard.
- **Rules**: We enforce a set of security-specific rules to prevent common coding errors.

## GitHub Code Scanning (SARIF)

We use the SARIF (Static Analysis Results Interchange Format) to integrate various security tools into the GitHub interface.

- **Integration**: Tools like OpenSSF Scorecard upload findings in SARIF format.
- **Visibility**: All integrated findings appear under the **Security** tab in the GitHub repository.

## Feedback and Results

- Most security tools run on every Pull Request to the `development` branch.
- Critical vulnerabilities may block merges if the relevant quality gates are not met.
