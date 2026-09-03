/**
 * The inactivity windows a user is allowed to choose between.
 *
 * These mirror SESSION_TIMEOUT_OPTIONS_MINUTES on the API, which validates the
 * chosen value and enforces it with a database constraint. Offering something
 * here that the API does not accept turns a save into a 400.
 */
export const SESSION_TIMEOUT_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
] as const;

/** Applied to accounts that have never chosen, matching the API's default. */
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 240;
