# Contributing to sto-info-frontend

Thank you for considering contributing to sto-info-frontend! We appreciate your time and effort to help improve the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please report it by opening an issue on our [GitHub Issues](https://github.com/steverobertsuk/sto-info-frontend/issues) page. Include as much detail as possible to help us understand and reproduce the issue.

### Suggesting Enhancements

We welcome suggestions for new features or improvements. Please open an issue on our [GitHub Issues](https://github.com/steverobertsuk/sto-info-frontend/issues) page and describe your idea in detail.

### Submitting Pull Requests

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes.
4. Ensure your code follows our coding standards and passes all tests.
5. Commit your changes with a descriptive commit message.
6. Push your branch to your forked repository.
7. Open a pull request on our [GitHub Pull Requests](https://github.com/steverobertsuk/sto-info-frontend/pulls) page.

### Code Style

Please follow the coding style used in the project. This includes indentation, naming conventions, and file organisation. Consistent code style helps maintain readability and ease of maintenance.

### Testing

Ensure that your changes do not break existing functionality by running the tests. If you add new features, please include corresponding tests.

### Documentation

Update the documentation to reflect your changes. This includes comments in the code, as well as updates to any relevant markdown files.

### Developer Certificate of Origin (DCO)

To ensure that all contributions are legally cleared, we require all contributors to sign off on their commits. This is done by adding a `Signed-off-by` line to your commit messages.

You can do this automatically by using the `-s` or `--signoff` flag when committing:

```bash
git commit -s -m "Your descriptive commit message"
```

By signing off on your commits, you certify that you have the right to submit the code under the project's licence.

**Local check (Husky):** This repo uses [Husky](https://typicode.github.io/husky/) to run a Git `commit-msg` hook. The hook (see [.husky/commit-msg](.husky/commit-msg)) ensures every commit message contains a `Signed-off-by` line. If you commit without it, the hook will reject the commit and remind you to use `git commit -s` or add the line manually. DCO is also enforced in CI via the [DCO workflow](.github/workflows/dco.yml).

## Code of Conduct

Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions with the project.

Thank you for contributing!
