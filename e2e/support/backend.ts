import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * The few things a journey cannot do through the browser.
 *
 * Turning the feature on, making an acceptance look out of date and making a
 * deletion look 180 days old all need the database. Rather than give this
 * harness database credentials — or ask the running server for a test-only
 * route that would then exist in production too — it asks the backend to do
 * them, through a command that already has a connection and knows the schema.
 *
 * See sto-info-backend/scripts/e2e-support.ts.
 */

const backendDirectory = resolve(
  process.env['E2E_BACKEND_DIR'] ?? '../sto-info-backend',
);

/**
 * dotenv and npm both write to stdout before the command does, so the answer
 * is the last line that parses as JSON rather than simply the last line.
 */
function parseLastJson<T>(output: string, command: string): T {
  const lines = output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .reverse();

  for (const line of lines) {
    if (line.startsWith('{')) {
      return JSON.parse(line) as T;
    }
  }

  throw new Error(
    `The backend support command "${command}" printed nothing this harness could read:\n${output}`,
  );
}

/**
 * Starts a backend support command without waiting for it, for one that
 * watches for something the journey is about to cause (FC-044).
 *
 * @param args - The command and its arguments.
 * @returns `ready`, settled once the command prints `{"waiting":true}`, and
 *   `done`, its answer.
 */
export function backendSupportStarted<T>(...args: string[]): {
  ready: Promise<void>;
  done: Promise<T>;
} {
  const command = args.join(' ');
  const child = spawn(
    'npm',
    ['run', '--silent', 'e2e:support', '--', ...args],
    {
      cwd: backendDirectory,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  let errors = '';
  let markReady: () => void = () => undefined;
  const ready = new Promise<void>(resolveReady => {
    markReady = resolveReady;
  });

  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    output += chunk;

    if (output.includes('{"waiting":true}')) {
      markReady();
    }
  });
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    errors += chunk;
  });

  const done = new Promise<T>((resolveDone, reject) => {
    child.on('close', code => {
      markReady();

      if (code === 0) {
        resolveDone(parseLastJson<T>(output, command));
      } else {
        reject(
          new Error(
            `The backend support command "${command}" failed:\n${errors}`,
          ),
        );
      }
    });
  });

  return { ready, done };
}

export function backendSupport<T>(...args: string[]): T {
  const command = args.join(' ');

  let output: string;

  try {
    output = execFileSync(
      'npm',
      ['run', '--silent', 'e2e:support', '--', ...args],
      {
        cwd: backendDirectory,
        encoding: 'utf8',
        // npm is a shell script on this platform, and the backend repository is
        // a sibling rather than a dependency, so there is no binary to spawn
        // directly.
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    throw new Error(
      `The backend support command "${command}" failed. Is the backend checked out at ${backendDirectory} with its dependencies installed?\n${(error as Error).message}`,
      { cause: error },
    );
  }

  return parseLastJson<T>(output, command);
}

export interface CustomTrackingCounts {
  email: string;
  live: Record<string, number>;
  deleted: Record<string, number>;
  imageCleanupQueue: number;
}

export const backend = {
  /** Switch the feature on and clear whatever a previous run left behind. */
  begin(email: string): void {
    backendSupport('begin', email);
  },

  /** Clear what the run built, then switch the feature back off. */
  finish(email: string): void {
    backendSupport('finish', email);
  },

  /** Switch Custom Tracking on or off for everybody. */
  setFeature(state: 'on' | 'off'): void {
    backendSupport('flag', state);
  },

  /** Remove every trace of this member's tracking data, as closure would. */
  reset(email: string): void {
    backendSupport('reset', email);
  },

  /** Make the acceptance on file look like an older version of the agreement. */
  staleAcceptance(email: string): void {
    backendSupport('stale-acceptance', email);
  },

  /** Backdate this member's deletions so the retention sweep is due to act. */
  age(email: string, days: number): void {
    backendSupport('age', email, String(days));
  },

  /** Disable or re-enable the member's account, as moderation would. */
  setDisabled(email: string, state: 'on' | 'off'): void {
    backendSupport('disabled', email, state);
  },

  /** Run the nightly retention job now. */
  runCleanup(): void {
    backendSupport('cleanup');
  },

  /** What the member still holds, live and deleted. */
  counts(email: string): CustomTrackingCounts {
    return backendSupport<CustomTrackingCounts>('counts', email);
  },
};
