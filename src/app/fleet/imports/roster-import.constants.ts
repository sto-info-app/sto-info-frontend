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

/** Either capability, which is what reading a Fleet's imports takes. */
export const ROSTER_IMPORT_READERS: readonly string[] = [
  ROSTER_IMPORT_CAPABILITY,
  ROSTER_INVESTIGATE_CAPABILITY,
];

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
