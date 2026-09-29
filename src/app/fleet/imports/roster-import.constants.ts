/** The capability that lets somebody put a roster into a Fleet. */
export const ROSTER_IMPORT_CAPABILITY = 'roster.import';

/**
 * The capability that lets somebody look into a Fleet's imports.
 *
 * Either this or {@link ROSTER_IMPORT_CAPABILITY} lets somebody list a
 * Fleet's imports and follow each one. Only this shows which rows were at
 * fault and which other imports an import is in conflict with.
 */
export const ROSTER_INVESTIGATE_CAPABILITY = 'roster.investigate';

/**
 * A site admin's look into a Fleet (FC-036): what
 * {@link ROSTER_INVESTIGATE_CAPABILITY} reads, for 24 hours under a logged
 * purpose, and nothing it changes.
 */
export const ROSTER_INVESTIGATE_READ_CAPABILITY = 'roster.investigate.read';

/** What reading what investigating reads takes. */
export const ROSTER_INVESTIGATION_READERS: readonly string[] = [
  ROSTER_INVESTIGATE_CAPABILITY,
  ROSTER_INVESTIGATE_READ_CAPABILITY,
];

/** Any of these, which is what reading a Fleet's imports takes. */
export const ROSTER_IMPORT_READERS: readonly string[] = [
  ROSTER_IMPORT_CAPABILITY,
  ...ROSTER_INVESTIGATION_READERS,
];

/**
 * Whether somebody reads what investigating reads but may change none of it:
 * a site admin looking in (FC-036).
 *
 * @param capabilities - What they hold at the Fleet.
 * @returns True when they look in read-only.
 */
export function readsOnly(capabilities: readonly string[]): boolean {
  return (
    capabilities.includes(ROSTER_INVESTIGATE_READ_CAPABILITY) &&
    !capabilities.includes(ROSTER_INVESTIGATE_CAPABILITY)
  );
}

/** What a site admin looking in is told on each page they read. */
export const ROSTER_READ_ONLY_NOTE =
  'You are looking in as a site admin: you can read this, and change nothing. Your look, and why, is logged.';

/** How often an import that has not settled is read again. */
export const ROSTER_IMPORT_POLL_INTERVAL_MS = 5_000;

/**
 * How long an import is watched before the page stops asking by itself.
 *
 * A scan normally finishes in seconds. One still running after two minutes is
 * waiting on something — a scanner that is down, a retry that is queued — and
 * asking every five seconds for as long as the tab is open would be asking a
 * question whose answer is not coming soon.
 */
export const ROSTER_IMPORT_POLL_WINDOW_MS = 120_000;
