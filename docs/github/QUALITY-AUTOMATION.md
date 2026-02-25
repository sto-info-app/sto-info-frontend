# Quality Automation

This project implements automated quality controls to ensure code consistency, reliability, and performance.

## Semantic PRs

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for Pull Request titles.

- **Why**: Ensures a clear, machine-readable history for automated versioning and changelog generation.
- **Enforcement**: A GitHub Action validates the PR title format (e.g., `feat: add character count`, `fix: resolve login loop`).
- **Fix**: Update the PR title to match the required format if the check fails.

## Codecov

Codecov is used to track and report code coverage from our unit tests.

- **Metrics**: Measures what percentage of the codebase is exercised by tests.
- **Checks**: A coverage report is posted as a comment on PRs.
- **Blocking**: Significant drops in coverage may cause the PR check to fail, requiring additional tests before merging.

## SonarCloud Quality Gate

SonarCloud acts as a final gatekeeper for code quality.

- **Standards**: It checks for bugs, code smells, and duplication.
- **Status**: The Quality Gate status appears on the PR. If the gate fails, the PR must be improved to meet the project's quality standards.

## Mutation Testing

Property-based mutation testing measures the effectiveness of our unit tests by introducing deliberate faults (mutations) into the code.

- **Tool**: [Stryker Mutator](https://stryker-mutator.io/)
- **Full Analysis**: Runs weekly on a schedule.
- **Incremental Analysis**: Runs on every Pull Request to `development` or `production`. Only mutates files that have changed in the PR, providing fast quality feedback without the overhead of a full run.
- **Reporting**: Full reports are available as workflow artifacts.

## Lighthouse CI

We use [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to audit the application for performance, accessibility, best practices, and SEO.

- **Thresholds**: We enforce a minimum score of **0.9 (90%)** for all core categories (Performance, Accessibility, Best Practices, SEO) for desktop.
- **Pages Audited**: Key public pages including Home, Login, Register, About, Privacy Policy, and Terms of Use.
- **Execution**:
  - On every Pull Request (Smart Skip applies if only non-code files change).
  - Weekly full audit on a schedule.
- **Reports**:
  - **Dashboard Summary**: A high-level summary table is posted as a **PR Comment** and included in the **GitHub Job Summary**.
  - **Local**: HTML reports are saved to `reports/lighthouse/` when running `npm run lighthouse`.
  - **CI Storage**: Uploaded to temporary public storage (link provided in CI logs).
  - **Artifacts**: Full reports available as GitHub Action artifacts for 30 days.

## CI Summary System (High Visibility)

To ensure quality metrics are never missed, we use a custom unified summary system (`scripts/generate-ci-summary.mjs`) that aggregates results from multiple sources.

- **Visibility**:
  - **PR Comments**: Every Pull Request automatically receives a comment with the latest test results, coverage percentages, and Lighthouse scores.
  - **Job Summary**: Each workflow run generates a rich Markdown "Summary" page on GitHub with color-coded status indicators.
- **Metrics Tracked**:
  - **Unit Tests**: Pass/Fail/Skip counts from Jest.
  - **Code Coverage**: Detailed breakdown of Statement, Branch, Function, and Line coverage (monitored against our 99% threshold).
  - **Performance**: Averaged Lighthouse scores across all audited pages.
- **Why**: This provides a "dashboard experience" directly in the developer's workflow, eliminating the need to search through raw console logs or download artifacts to understand the state of a PR.

## Smart CI Skip Logic

To maintain high standards without wasting CI minutes, our quality workflows (`Lint and Test`) use smart skip logic:

- **Documentation/Meta-files**: If a PR only changes files like `.md` or `.vscode/`, the heavy test and build steps are skipped.
- **Always Reporting**: Even when skipped, the job reports a success status to GitHub. This ensures the job can be set as a **Required Check** in branch protection rules without blocking non-code PRs.

## Sentry

Sentry provides runtime error tracking and performance monitoring.

- **Monitoring**: Captures exceptions and performance data in production and development environments.
- **Config**: We use `sendDefaultPii: false` to ensure no sensitive user data is sent to Sentry.
- **Usage**: Developers use Sentry logs to identify and debug production issues quickly.

## Related Documentation

For security-specific automated checks, see [Security Automation](SECURITY-AUTOMATION.md).
