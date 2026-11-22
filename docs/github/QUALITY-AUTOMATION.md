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

Mutation testing measures the effectiveness of our unit tests by introducing deliberate faults (mutations) into the code.

- **Tool**: [Stryker Mutator](https://stryker-mutator.io/)
- **Full Analysis**: Runs weekly on a schedule, split into shards. See [Weekly full run](#weekly-full-run).
- **Incremental Analysis**: Runs on every pull request to `development` or an `epic/*` branch. Only mutates files that have changed in the PR, providing fast quality feedback without the overhead of a full run. A PR that changes more than 100 mutatable files (`MUTATION_MAX_FILES` in `mutation-testing-incremental.yml`) skips it and is left to the weekly run: a diff that wide is a full run in all but name and cannot finish inside the job's 240 minutes.
- **Reporting**: Reports are available as workflow artifacts: `stryker-incremental-report` for a PR, and `stryker-full-report` (the merged HTML and JSON) for the weekly run.

### Weekly full run

`.github/workflows/mutation-testing.yml` runs every Sunday at midnight UTC, and can be started by hand from the Actions tab.

**Why it is split.** A GitHub-hosted job is stopped at 6 hours, whatever its `timeout-minutes` says. As a single job the run took 4 to 5.6 hours for 16,724 mutants, and was cancelled at 6 hours one week in three. The Fleet Community merge takes the mutate set from ~265 to ~480 files (about 30,000 mutants, roughly 10 hours in one job).

**How it is split.**

- `scripts/mutation-shards.mjs` expands the `mutate` globs in `stryker.config.json` and puts each file in one of `SHARD_TOTAL` shards (4) by a hash of its path. A file stays in the same shard as other files are added or removed, so its saved results stay with it.
- Each shard is a matrix job (`Full Mutation Analysis (shard N)`), with its own 6-hour limit and 16 GB runner. It runs Stryker on its files with `stryker.shard.config.mjs`, which is the base config without the `break` threshold, at `--concurrency 2` for the dry run's memory. From cold a shard takes about 2.5 to 3 hours. The Stryker step stops at 330 minutes, so the upload steps still run if it overruns.
- The `Full Mutation Analysis` job then merges the shard reports into one `mutation.json` and `mutation.html`, writes the score and mutant counts to the run summary, and fails if a shard's report is missing or the combined score is below the `break` threshold (50%).

**Incremental results.** Each shard runs Stryker with `--incremental` and keeps its results file (`reports/stryker-incremental/shard-N-of-T.json`) in the Actions cache. The next run re-tests only mutants whose source or covering tests changed, so a quiet week is quick. The cache is saved only when the shard's Stryker step succeeds. To test every mutant again, for example after changing mutators or Stryker's version, start the workflow by hand with **force** ticked.

**Changing the shard count.** Change `SHARD_TOTAL` and the matrix's `shard` list together; a matrix cannot read `env`. The cache key includes the total, so every shard starts afresh and the next run is a cold one. Keep each shard comfortably under 330 minutes from cold.

**Locally.**

```bash
npm run test:mutation:shard -- list 2 4   # files in shard 2 of 4
npm run test:mutation:shard -- run 2 4    # run shard 2 of 4 (add --force to ignore saved results)
npm run test:mutation:shard -- merge <dir with shard reports> reports/mutation 4
npm run test:scripts                      # tests for the shard script
```

`scripts/mutation-shards.mjs` and its tests are the same in the backend and the frontend. Change them in both.

## Lighthouse

We run [Lighthouse](https://github.com/GoogleChrome/lighthouse) 13 directly from `scripts/lighthouse-audit.mjs` (configured in `lighthouse.config.json`) to audit the public pages for performance, accessibility, best practices, and SEO. It replaced Lighthouse CI, which pinned Lighthouse 12 and an unpatched dependency chain.

- **Thresholds** (desktop):
  - Category minimums: **0.8** for Performance, **0.9** for Accessibility, Best Practices and SEO.
  - Every other audit Lighthouse scores must reach **0.9**, unless `lighthouse.config.json` sets it to `warn`, `off` or its own threshold. The weighted performance metrics are left to the Performance category score.
  - Assertions judge the **median** of three runs per page.
- **Pages Audited**: the static public pages listed in `lighthouse.config.json` (Home, About and team pages, Contact, Resources, Roadmap, Credits, Privacy Policy, Terms of Use).
- **Execution**:
  - On every Pull Request (Smart Skip applies if only non-code files change).
  - Weekly full audit on a schedule.
- **Reports**:
  - **Dashboard Summary**: A high-level summary table is posted as a **PR Comment** and included in the **GitHub Job Summary**.
  - **Local**: HTML and JSON reports, `manifest.json` and `assertion-results.json` are saved to `reports/lighthouse/`.
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
