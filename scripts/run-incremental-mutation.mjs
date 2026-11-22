import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';

const NODE_PATH = process.execPath;

/**
 * Optional upper bound on how many mutatable source files a run will accept.
 * Above it the diff is left to the scheduled full run, because a PR that wide
 * is a full run in all but name and cannot finish inside the job's budget.
 * Off (0) unless MUTATION_MAX_FILES is set; the workflow sets it.
 */
const DEFAULT_MAX_MUTATE_FILES = 0;

/**
 * Executes a command with absolute paths and explicit environment to satisfy S4036.
 */
function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env }, // Explicitly pass environment
    ...options,
  });
}

function runOrThrow(command, args) {
  const result = runCommand(command, args);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    const output = [stdout, stderr].filter(Boolean).join('\n');
    const outputSuffix = output ? `\n${output}` : '';
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}${outputSuffix}`,
    );
  }

  return result.stdout;
}

function isRelevantMutationFile(filePath) {
  if (!filePath.startsWith('src/') || !filePath.endsWith('.ts')) return false;

  const excludedSuffixes = [
    '.d.ts',
    '.spec.ts',
    '.module.ts',
    '.model.ts',
    '.models.ts',
    '.interface.ts',
    '.interfaces.ts',
    '.enum.ts',
    '.constant.ts',
    '.constants.ts',
  ];

  if (excludedSuffixes.some(suffix => filePath.endsWith(suffix))) return false;
  if (filePath.includes('environments/')) return false;
  if (filePath.includes('static-pages/')) return false;
  if (filePath.includes('shared/components/lcars-')) return false;
  if (filePath.includes('template/footer')) return false;

  const excludedFiles = ['src/main.ts', 'src/polyfills.ts', 'src/test.ts'];
  if (excludedFiles.includes(filePath)) return false;

  return true;
}

function computeChangedFiles(baseRef) {
  // For git, we use the name directly but ensure we run in a controlled environment.
  // In most CI/CD environments, 'git' is a trusted system binary.
  const stdout = runOrThrow('git', [
    'diff',
    '--name-only',
    `${baseRef}...HEAD`,
  ]);

  return stdout
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(isRelevantMutationFile);
}

function resolveMaxFiles() {
  const raw = process.env.MUTATION_MAX_FILES;
  if (!raw) return DEFAULT_MAX_MUTATE_FILES;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `MUTATION_MAX_FILES must be a positive integer, received "${raw}".`,
    );
  }

  return parsed;
}

function exceedsLimit(fileCount, maxFiles) {
  return maxFiles > 0 && fileCount > maxFiles;
}

function main() {
  const baseRef = process.env.BASE_REF || 'origin/development';

  const changedFiles = computeChangedFiles(baseRef);
  if (changedFiles.length === 0) {
    process.stdout.write(
      'No relevant source files changed. Skipping mutation testing.\n',
    );
    process.exit(0);
  }

  const maxFiles = resolveMaxFiles();
  if (exceedsLimit(changedFiles.length, maxFiles)) {
    process.stdout.write(
      `${changedFiles.length} mutatable files changed, above the ` +
        `MUTATION_MAX_FILES limit of ${maxFiles}. Leaving this diff to the ` +
        'scheduled full run (Mutation Testing (Full)).\n',
    );
    process.exit(0);
  }

  const mutateArg = changedFiles.join(',');
  process.stdout.write(
    `Mutating ${changedFiles.length} file(s): ${mutateArg}\n`,
  );

  const strykerPath = join(
    process.cwd(),
    'node_modules',
    '@stryker-mutator',
    'core',
    'bin',
    'stryker',
  );

  const result = spawnSync(
    NODE_PATH,
    [
      strykerPath,
      'run',
      '--mutate',
      mutateArg,
      // No --concurrency here: stryker.config.json owns that, so the two run
      // modes cannot drift. No --incremental either: it was previously paired
      // with --force, which Stryker documents as "run all mutants, even if
      // --incremental is provided and an incremental file exists", so the
      // cached result was read and then ignored on every run. Restoring the
      // pair properly would not help either — restricting --mutate to the
      // changed files means Stryker writes back a report covering only those
      // files, overwriting the broader cache the next PR would have wanted.
    ],
    {
      stdio: 'inherit',
      env: { ...process.env },
    },
  );

  process.exit(result.status ?? 1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
