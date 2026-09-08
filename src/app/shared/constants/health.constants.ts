export const API_HEALTH_STATE_UNKNOWN = 'UNKNOWN';
export const API_HEALTH_STATE_UP = 'UP';
export const API_HEALTH_STATE_DOWN = 'DOWN';
export const DEFAULT_API_HEALTH_STATE = API_HEALTH_STATE_UNKNOWN;
export type API_HEALTH_STATE =
  | typeof API_HEALTH_STATE_UNKNOWN
  | typeof API_HEALTH_STATE_UP
  | typeof API_HEALTH_STATE_DOWN;

/** Consecutive failed checks tolerated silently before anything is shown. */
export const API_HEALTH_FAILURES_BEFORE_WARNING = 4;

/**
 * Consecutive failed checks required before the API is declared DOWN and the
 * service interruption page replaces the route content.
 */
export const API_HEALTH_FAILURES_BEFORE_DOWN = 31;

/** Failure count representing a healthy API. */
export const NO_API_HEALTH_FAILURES = 0;
