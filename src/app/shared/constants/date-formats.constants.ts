/**
 * `DatePipe` format for a timestamp an administrator may have to act on.
 *
 * The same as the pipe's built-in `medium`, plus the zone: an account's last
 * sign-in or the moment an override was applied is read against a support
 * request or a log line from somewhere else in the world, and a bare wall-clock
 * time cannot be compared with either.
 */
export const DATE_TIME_WITH_ZONE_FORMAT = 'MMM d, y, h:mm:ss a z';
