/**
 * Days in a timezone, as a reader picks them, and the instants they run
 * between.
 *
 * A reader choosing "the roster on 15 November" means 15 November where they
 * are: their display timezone (ADR-0012), not UTC and not the browser's.
 * These turn such a day into the instants a server asks for, and an instant
 * back into the day it fell on there, reading every offset from `Intl` so
 * summer time is whatever the IANA database says it was on that day.
 */

/** A day as `<input type="date">` gives and takes it: `YYYY-MM-DD`. */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The day an instant fell on in a timezone.
 *
 * @param instant - The instant, as an ISO string.
 * @param timezone - The IANA zone.
 * @returns The day, `YYYY-MM-DD`.
 */
export function localDayOf(instant: string, timezone: string): string {
  // en-CA writes a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}

/**
 * The first instant of a day in a timezone.
 *
 * @param day - The day, `YYYY-MM-DD`.
 * @param timezone - The IANA zone.
 * @returns The instant, as an ISO string, or null for a day that is not one.
 */
export function startOfLocalDay(day: string, timezone: string): string | null {
  const midnight = midnightOf(day, 0, timezone);

  return midnight === null ? null : new Date(midnight).toISOString();
}

/**
 * The last instant of a day in a timezone: a millisecond before the next
 * day begins there.
 *
 * @param day - The day, `YYYY-MM-DD`.
 * @param timezone - The IANA zone.
 * @returns The instant, as an ISO string, or null for a day that is not one.
 */
export function endOfLocalDay(day: string, timezone: string): string | null {
  const nextMidnight = midnightOf(day, 1, timezone);

  return nextMidnight === null
    ? null
    : new Date(nextMidnight - 1).toISOString();
}

/** A wall-clock time as an export's stamp is kept: `YYYY-MM-DDTHH:mm:ss`. */
const STAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/** A day, in milliseconds. */
const DAY_MS = 86_400_000;

/**
 * Every instant a wall-clock time names in a timezone.
 *
 * Usually one. None for a time the clock skipped when it went forward, and
 * two for one in the hour it went back over — which is when somebody has to
 * say which. The offsets either side of the time are each tried, and an
 * instant kept only if the zone's own clock read that time at it.
 *
 * @param stamp - The wall-clock time, `YYYY-MM-DDTHH:mm:ss`.
 * @param timezone - The IANA zone.
 * @returns The instants, earliest first, as ISO strings; none for a stamp
 *   that is not one.
 */
export function momentsOf(stamp: string, timezone: string): string[] {
  const match = STAMP.exec(stamp);

  if (match === null) {
    return [];
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const found = new Set<number>();

  for (const probe of [wall - DAY_MS, wall + DAY_MS]) {
    const candidate = wall - offsetMinutes(probe, timezone) * 60_000;

    if (candidate + offsetMinutes(candidate, timezone) * 60_000 === wall) {
      found.add(candidate);
    }
  }

  return [...found]
    .sort((a, b) => a - b)
    .map(instant => new Date(instant).toISOString());
}

/**
 * The instant a day's midnight fell at in a timezone, a number of days on.
 *
 * Read twice: the offset at a guess, then at the answer that guess gives, so
 * a day whose offset differs from UTC's at the same moment still lands.
 *
 * @param day - The day, `YYYY-MM-DD`.
 * @param addDays - Days to move on first.
 * @param timezone - The IANA zone.
 * @returns Epoch milliseconds, or null for a day that is not one.
 */
function midnightOf(
  day: string,
  addDays: number,
  timezone: string,
): number | null {
  const match = DAY.exec(day);

  if (match === null) {
    return null;
  }

  const [, year, month, date] = match.map(Number);
  // Four, two and two digits always make a number; an overlong month or day
  // rolls on, as the input control never sends one.
  const wall = Date.UTC(year, month - 1, date + addDays);
  const first = wall - offsetMinutes(wall, timezone) * 60_000;

  return wall - offsetMinutes(first, timezone) * 60_000;
}

/**
 * How far ahead of UTC a timezone was at an instant.
 *
 * @param instant - Epoch milliseconds.
 * @param timezone - The IANA zone.
 * @returns The offset in minutes; 0 where it cannot be read.
 */
function offsetMinutes(instant: number, timezone: string): number {
  const name =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(instant))
      .find(part => part.type === 'timeZoneName')?.value ?? '';
  // `longOffset` is always the padded GMT+01:00 form, UTC itself included.
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);

  if (match === null) {
    return 0;
  }

  const minutes = Number(match[2]) * 60 + Number(match[3]);

  return match[1] === '-' ? -minutes : minutes;
}
