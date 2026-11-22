import { FleetCalendarEntry } from 'src/app/models/fleet-events.models';

/** How the calendar is drawn. */
export type FleetCalendarView = 'month' | 'agenda';

/** A month, YYYY-MM. */
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** One day, in milliseconds. */
const DAY = 86_400_000;

/** One day of the grid or the agenda, and what falls on it. */
export interface FleetCalendarDay {
  /** YYYY-MM-DD in the reader's zone. */
  readonly key: string;
  /** Its day of the month. */
  readonly date: number;
  /** Whether it belongs to the month shown, rather than padding a week. */
  readonly inMonth: boolean;
  /** Whether it is today, in the reader's zone. */
  readonly isToday: boolean;
  readonly entries: readonly FleetCalendarEntry[];
}

/**
 * Reads the month the address asks for, or the current one.
 *
 * @param param - The address's `month`, if any.
 * @param now - The moment.
 * @param zone - The reader's zone.
 * @returns YYYY-MM.
 */
export function calendarMonthOf(
  param: string | null,
  now: Date,
  zone: string,
): string {
  return param !== null && MONTH_PATTERN.test(param)
    ? param
    : dayKeyOf(now, zone).slice(0, 7);
}

/**
 * Moves a month on or back.
 *
 * @param month - YYYY-MM.
 * @param by - How many months, negative for back.
 * @returns YYYY-MM.
 */
export function shiftMonth(month: string, by: number): string {
  const [, year, number] = MONTH_PATTERN.exec(month) as RegExpExecArray;
  const moved = new Date(Date.UTC(Number(year), Number(number) - 1 + by, 1));

  return moved.toISOString().slice(0, 7);
}

/**
 * Names a month.
 *
 * @param month - YYYY-MM.
 * @returns Such as "December 2029".
 */
export function monthNameOf(month: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/**
 * The stretch of the calendar to read for a month: a week either side of
 * it, so that the days padding the grid and any reader's zone are covered.
 *
 * @param month - YYYY-MM.
 * @returns From and to, ISO instants.
 */
export function calendarRangeOf(month: string): { from: string; to: string } {
  const first = new Date(`${month}-01T00:00:00Z`);
  const next = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);

  return {
    from: new Date(first.getTime() - 7 * DAY).toISOString(),
    to: new Date(next.getTime() + 7 * DAY).toISOString(),
  };
}

/**
 * The day an instant falls on in a zone.
 *
 * @param instant - The instant.
 * @param zone - The zone.
 * @returns YYYY-MM-DD.
 */
export function dayKeyOf(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * Lays a month out as weeks from Monday, each day with what starts on it in
 * the reader's zone.
 *
 * @param month - YYYY-MM.
 * @param entries - What the calendar holds.
 * @param today - Today, YYYY-MM-DD in the reader's zone.
 * @param zone - The reader's zone.
 * @returns The weeks.
 */
export function monthGridOf(
  month: string,
  entries: readonly FleetCalendarEntry[],
  today: string,
  zone: string,
): FleetCalendarDay[][] {
  const byDay = entriesByDay(entries, zone);
  const first = new Date(`${month}-01T00:00:00Z`);
  const next = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
  // ISO weekday of the 1st, 1 Monday to 7 Sunday.
  const weekday = ((first.getUTCDay() + 6) % 7) + 1;
  const start = new Date(first.getTime() - (weekday - 1) * DAY);
  const weeks: FleetCalendarDay[][] = [];

  // Whole weeks, from the Monday before the 1st until the week holding the
  // last day of the month is full.
  for (let day = start; day < next;) {
    const week: FleetCalendarDay[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const key = day.toISOString().slice(0, 10);

      week.push({
        key,
        date: day.getUTCDate(),
        inMonth: key.startsWith(month),
        isToday: key === today,
        entries: byDay.get(key) ?? [],
      });
      day = new Date(day.getTime() + DAY);
    }

    weeks.push(week);
  }

  return weeks;
}

/**
 * Lists the days of a month that anything starts on, in the reader's zone.
 *
 * @param month - YYYY-MM.
 * @param entries - What the calendar holds.
 * @param today - Today, YYYY-MM-DD in the reader's zone.
 * @param zone - The reader's zone.
 * @returns Those days, earliest first.
 */
export function agendaOf(
  month: string,
  entries: readonly FleetCalendarEntry[],
  today: string,
  zone: string,
): FleetCalendarDay[] {
  return [...entriesByDay(entries, zone)]
    .filter(([key]) => key.startsWith(month))
    .map(([key, onDay]) => ({
      key,
      date: Number(key.slice(8)),
      inMonth: true,
      isToday: key === today,
      entries: onDay,
    }));
}

/**
 * Sorts entries by the day they start on in a zone, keeping their order.
 *
 * @param entries - What the calendar holds, earliest first.
 * @param zone - The reader's zone.
 * @returns Each day's entries.
 */
function entriesByDay(
  entries: readonly FleetCalendarEntry[],
  zone: string,
): Map<string, FleetCalendarEntry[]> {
  const byDay = new Map<string, FleetCalendarEntry[]>();

  for (const entry of entries) {
    const key = dayKeyOf(new Date(entry.occurrence.startsAt), zone);

    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }

  return byDay;
}
