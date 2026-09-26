import { execFileSync } from 'node:child_process';
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
 * Node 24 does not use the operating system's certificate store unless asked.
 * The backend looks up its database password over TLS, so the support command
 * needs that flag even when the shell that started Playwright did not set it.
 */
function nodeOptions(): string {
  const current = process.env['NODE_OPTIONS'] ?? '';

  if (current.includes('--use-system-ca')) {
    return current;
  }

  return `${current} --use-system-ca`.trim();
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
        // directly. Node 24 verifies TLS with its own store unless told to
        // use the system one, which is what the backend's secret lookup needs.
        shell: true,
        env: {
          ...process.env,
          NODE_OPTIONS: nodeOptions(),
        },
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

/** A fixture actor. The password is never part of this. */
export interface KnownActor {
  code: string;
  email: string;
  username: string;
  userId: string;
  role: string;
  emailVerified: boolean;
  isAccountDisabled: boolean;
  grants: string[];
}

/**
 * What the backend support command can see of the database it is connected to.
 * Connection strings and passwords are not included.
 */
export interface EnvironmentReport {
  databaseName: string;
  databaseHost: string;
  schema: string;
  nodeEnv: string;
  redisDatabase: number;
  migration: string;
  backendSha: string;
  features: {
    customTracking: boolean;
    storytime: boolean;
  };
  metadata: {
    factions: number;
    species: number;
    classes: number;
  };
  demo: {
    email: string;
    username: string;
    role: string;
    emailVerified: boolean;
    isAccountDisabled: boolean;
    publicAccount: boolean;
    privateAccount: boolean;
    characters: number;
  };
  actors: KnownActor[];
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

  /**
   * The database, feature switches and fixture actors.
   * Passwords are not in the answer.
   */
  preflight(
    email: string,
    publicAccount: string,
    privateAccount: string,
  ): EnvironmentReport {
    return backendSupport<EnvironmentReport>(
      'preflight',
      email,
      publicAccount,
      privateAccount,
    );
  },

  /** Enable one fixture actor again. The demonstration member is refused. */
  prepareActor(email: string): KnownActor {
    return backendSupport<KnownActor>('prepare', email);
  },

  /** One fixture actor's role and grants. */
  actor(email: string): KnownActor {
    return backendSupport<KnownActor>('actor', email);
  },

  /** This member's accounts and captains, and a public and private profile. */
  snapshot(email: string): MemberSnapshot {
    return backendSupport<MemberSnapshot>('snapshot', email);
  },

  /** Replace one account's notes. The previous notes come back. */
  setAccountNote(
    email: string,
    handleSlug: string,
    notes: string | null,
  ): { previous: string | null } {
    return backendSupport<{ previous: string | null }>(
      'set-note',
      email,
      handleSlug,
      encodeNote(notes),
    );
  },

  /**
   * Put two publication flags and one note back.
   *
   * A case that changed them calls this from `finally`, so a failure cannot
   * leave the demonstration accounts in the state the case was halfway through.
   */
  restoreAccounts(
    email: string,
    publicSlug: string,
    publicState: 'public' | 'private',
    privateSlug: string,
    privateState: 'public' | 'private',
    noteSlug: string,
    notes: string | null,
  ): void {
    backendSupport(
      'account-restore',
      email,
      publicSlug,
      publicState,
      privateSlug,
      privateState,
      noteSlug,
      encodeNote(notes),
    );
  },

  /** Soft-delete an account this case created. Missing accounts are ignored. */
  discardAccount(email: string, handle: string): void {
    backendSupport('discard-account', email, handle);
  },

  /** Publish one bulletin and keep a draft that must not be public. */
  seedNews(): SeededNews {
    return backendSupport<SeededNews>('news-seed');
  },

  /** Remove those bulletins. */
  clearNews(): void {
    backendSupport('news-clear');
  },

  /** Switch Storytime off. */
  storytimeOff(): void {
    backendSupport('storytime-off');
  },

  /** Switch Storytime on, without publishing anything. */
  storytimeOn(): void {
    backendSupport('storytime-on');
  },

  /** Remove stories and arcs a weekly case created for this member. */
  discardWeekly(email: string): void {
    backendSupport('storytime-discard-weekly', email);
  },

  /** Username, first name and registry flag currently stored for this member. */
  profileIdentity(email: string): ProfileIdentity {
    return backendSupport<ProfileIdentity>('profile-identity', email);
  },

  /**
   * Replace the username, first name and registry flag.
   *
   * The personal-details form refuses a username that contains a hyphen, which
   * is how the fixture accounts were created, so a case that has to save that
   * form — or list somebody in the registry — changes the stored profile here
   * and puts it back from `finally`.
   */
  writeProfileIdentity(
    email: string,
    username: string,
    firstName: string | null,
    state: 'public' | 'private',
  ): void {
    backendSupport(
      'profile-identity-set',
      email,
      username,
      encodeNote(firstName),
      state,
    );
  },

  /**
   * Switch Storytime on, publish a voyage and withhold creator permission
   * from the reader.
   */
  storytimeBegin(ownerEmail: string, readerEmail: string): SeededStorytime {
    return backendSupport<SeededStorytime>(
      'storytime-begin',
      ownerEmail,
      readerEmail,
    );
  },

  /** Remove the voyage, restore creator permission and switch Storytime off. */
  storytimeFinish(ownerEmail: string, readerEmail: string): void {
    backendSupport('storytime-finish', ownerEmail, readerEmail);
  },

  /**
   * The verification and reset links stored for an external account.
   *
   * The account is one this project registered at example.com. Nothing is
   * read from a mailbox.
   */
  /**
   * Forget the auth rate-limit counters.
   *
   * Sign-in and a mail case share one address. The limiter still applies to
   * the calls the case itself makes.
   */
  clearAuthLimit(): void {
    backendSupport('auth-limit-clear');
  },

  authLink(email: string): AuthLink {
    return backendSupport<AuthLink>('auth-link', email);
  },

  /** Age a stored verification or reset link. */
  expireAuthLink(email: string, kind: 'verification' | 'reset'): void {
    backendSupport('auth-link-expire', email, kind);
  },

  /** Hard-delete an external account. Missing accounts are ignored. */
  discardExternal(email: string): void {
    backendSupport('discard-external', email);
  },

  /** The contact request saved with this message. */
  contactLatest(message: string): StoredContact {
    return backendSupport<StoredContact>('contact-latest', encodeNote(message));
  },

  /** Remove contact requests saved with this message. */
  discardContact(message: string): void {
    backendSupport('contact-discard', encodeNote(message));
  },

  /** Delete the member's personnel picture from Cloudflare and clear the id. */
  clearPersonnelPicture(email: string): void {
    backendSupport('personnel-picture-clear', email);
  },

  /** Delete one captain's picture from Cloudflare and clear the id. */
  clearCharacterPicture(
    email: string,
    accountHandle: string,
    characterHandle: string,
  ): void {
    backendSupport(
      'character-picture-clear',
      email,
      accountHandle,
      characterHandle,
    );
  },
};

/** The links stored on an external account. Tokens are not written to a log. */
export interface AuthLink {
  emailVerified: boolean;
  verificationToken: string | null;
  resetToken: string | null;
}

/** A contact request this project saved. The address is not included. */
export interface StoredContact {
  name: string;
  topic: string;
  message: string;
}

/** The name and registry flag stored on one member's profile. */
export interface ProfileIdentity {
  username: string;
  firstName: string | null;
  publiclyVisible: boolean;
}

/** Accounts and captains belonging to one member. */
export interface MemberSnapshot {
  email: string;
  publicUsername: string;
  privateUsername: string;
  accounts: SnapshotAccount[];
}

/** One STO account and the captains on it. */
export interface SnapshotAccount {
  id: string;
  handle: string;
  handleSlug: string;
  notes: string | null;
  publiclyVisible: boolean;
  characters: SnapshotCharacter[];
}

/** One captain on an account in a snapshot. */
export interface SnapshotCharacter {
  id: string;
  accountId: string;
  handle: string;
  slug: string;
  publiclyVisible: boolean;
  notes: string | null;
}

/** The bulletin the news case reads, and the draft it must not find. */
export interface SeededNews {
  publishedTitle: string;
  publishedSlug: string;
  draftTitle: string;
  draftSlug: string;
  draftSecret: string;
}

/** The voyage the Storytime cases read, and the draft they must not find. */
export interface SeededStorytime {
  publishedTitle: string;
  publishedSlug: string;
  openingTitle: string;
  openingSlug: string;
  continuingTitle: string;
  continuingSlug: string;
  draftTitle: string;
  draftSlug: string;
  draftSecret: string;
}

/**
 * Notes go to the support command as a single argument.
 *
 * A demonstration note contains spaces, which the command line would split,
 * so the text is base64url. The two sentinels are the empty note and no note.
 */
function encodeNote(notes: string | null): string {
  if (notes === null) {
    return '--null--';
  }

  if (notes === '') {
    return '--empty--';
  }

  return Buffer.from(notes, 'utf8').toString('base64url');
}
