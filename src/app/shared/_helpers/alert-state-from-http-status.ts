import { AlertState } from '../constants/lcars-theme.constants';

/**
 * Maps an HTTP status code to an LCARS alert state.
 *
 * Mapping rules (as agreed):
 * - 404 -> red
 * - 5xx and 0 -> grey
 * - 2xx -> green
 * - 1xx -> blue
 * - all other 3xx/4xx (except 404) -> yellow
 */
export function alertStateFromHttpStatus(status: number): AlertState {
  if (status === 0 || status >= 500) {
    return 'grey';
  }
  if (status === 404) {
    return 'red';
  }
  if (status >= 200 && status < 300) {
    return 'green';
  }
  if (status >= 100 && status < 200) {
    return 'blue';
  }
  return 'yellow';
}
