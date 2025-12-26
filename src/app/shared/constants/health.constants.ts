export const API_HEALTH_STATE_UNKNOWN: string = 'UNKNOWN';
export const API_HEALTH_STATE_UP: string = 'UP';
export const API_HEALTH_STATE_DOWN: string = 'DOWN';
export const DEFAULT_API_HEALTH_STATE = API_HEALTH_STATE_UNKNOWN;
export type API_HEALTH_STATE =
  | typeof API_HEALTH_STATE_UNKNOWN
  | typeof API_HEALTH_STATE_UP
  | typeof API_HEALTH_STATE_DOWN;
