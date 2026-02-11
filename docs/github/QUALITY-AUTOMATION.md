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

## Sentry

Sentry provides runtime error tracking and performance monitoring.

- **Monitoring**: Captures exceptions and performance data in production and development environments.
- **Config**: We use `sendDefaultPii: false` to ensure no sensitive user data is sent to Sentry.
- **Usage**: Developers use Sentry logs to identify and debug production issues quickly.

## Related Documentation

For security-specific automated checks, see [Security Automation](SECURITY-AUTOMATION.md).
