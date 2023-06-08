const github = require('@actions/github');
const core = require('@actions/core');

async function run() {
  try {
    const octokit = github.getOctokit(core.getInput('github-token'));

    const context = github.context;
    if (context.payload.pull_request == null) {
      core.setFailed('No pull request found.');
      return;
    }
    const pull_number = context.payload.pull_request.number;

    await octokit.pulls.merge({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pull_number,
      merge_method: 'squash'
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
