import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';
import { RecruitmentCharacterOption } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetEventAction,
  FleetEventAudience,
  FleetEventDetail,
  FleetOccurrenceAdjustment,
  FleetReminderLead,
  FleetRsvpResponse,
} from 'src/app/models/fleet-events.models';

/** What kind of scope an event belongs to, for the wording of audiences. */
export type FleetEventScopeKind = 'COMMUNITY' | 'FLEET' | 'ARMADA';

/** What to say when a change to an event could not be made. */
export const FLEET_EVENTS_CHANGE_FAILED =
  'That could not be done. Please try again.';

/** What to say when a calendar or list could not be read. */
export const FLEET_EVENTS_READ_FAILED =
  'The events could not be read. Please try again.';

/** How each answer reads. */
export const FLEET_RSVP_LABELS: Readonly<Record<FleetRsvpResponse, string>> = {
  GOING: 'Going',
  MAYBE: 'Maybe',
  NOT_GOING: 'Can’t go',
};

/** The answers, in the order they are offered. */
export const FLEET_RSVP_RESPONSES: readonly FleetRsvpResponse[] = [
  'GOING',
  'MAYBE',
  'NOT_GOING',
];

/** How each reminder lead reads. */
export const FLEET_REMINDER_LABELS: Readonly<
  Record<FleetReminderLead, string>
> = {
  15: '15 minutes before',
  60: 'An hour before',
  1440: 'A day before',
};

/** ISO weekdays, 1 Monday to 7 Sunday, by name. */
export const FLEET_WEEKDAY_NAMES: readonly string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Which of a month's weekdays, by the number the rule stores. */
export const FLEET_MONTH_WEEK_NAMES: Readonly<Record<number, string>> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  [-1]: 'last',
};

/** What daylight saving did to an occurrence, where it did anything. */
export const FLEET_ADJUSTMENT_NOTES: Readonly<
  Record<FleetOccurrenceAdjustment, string | null>
> = {
  NONE: null,
  REPEATED_TIME:
    'The clocks go back over this time, so it is the first of the two.',
  MISSING_TIME:
    'The clocks go forward over this time, so it starts later by the jump.',
};

/**
 * Who an event is for, in words for the kind of scope.
 *
 * @param audience - The audience.
 * @param kind - The kind of scope.
 * @returns Who may see it.
 */
export function fleetEventAudienceLabel(
  audience: FleetEventAudience,
  kind: FleetEventScopeKind,
): string {
  const scope =
    kind === 'COMMUNITY'
      ? 'the Community'
      : kind === 'FLEET'
        ? 'the Fleet'
        : 'the Armada';

  switch (audience) {
    case 'PUBLIC':
      return 'Anyone';
    case 'COMMUNITY':
      return 'The Community’s followers and members';
    case 'MEMBERS':
      return `Members of ${scope}`;
    case 'OFFICERS':
      return `The Owner, Admins and Officers of ${scope}`;
    case 'SELECTED':
      return 'Chosen Fleets and roles';
  }
}

/**
 * A day of the month as an ordinal.
 *
 * @param day - 1 to 31.
 * @returns Such as "1st", "22nd" or "13th".
 */
export function ordinalOf(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen
    ? 'th'
    : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ??
      'th');

  return `${day}${suffix}`;
}

/**
 * Names a list in a sentence.
 *
 * @param items - The items.
 * @returns Such as "Monday, Wednesday and Friday".
 */
function listOf(items: readonly string[]): string {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Says how an event repeats, in a sentence.
 *
 * @param event - The event.
 * @returns Such as "Every 2 weeks on Monday and Friday, 10 times".
 */
export function fleetEventRuleOf(
  event: Pick<
    FleetEventDetail,
    | 'recurrence'
    | 'startDate'
    | 'interval'
    | 'weekdays'
    | 'monthDay'
    | 'monthWeek'
    | 'monthWeekday'
    | 'endsOn'
    | 'occurrenceLimit'
  >,
): string {
  if (event.recurrence === 'NONE') {
    return `Once, on ${event.startDate}`;
  }

  const every =
    event.recurrence === 'WEEKLY'
      ? event.interval === 1
        ? 'Every week'
        : `Every ${event.interval} weeks`
      : event.interval === 1
        ? 'Every month'
        : `Every ${event.interval} months`;
  const on =
    event.recurrence === 'WEEKLY'
      ? listOf(event.weekdays.map(day => FLEET_WEEKDAY_NAMES[day - 1]))
      : event.recurrence === 'MONTHLY_DAY'
        ? `the ${ordinalOf(event.monthDay as number)}`
        : `the ${FLEET_MONTH_WEEK_NAMES[event.monthWeek as number]} ${
            FLEET_WEEKDAY_NAMES[(event.monthWeekday as number) - 1]
          }`;
  const ends =
    event.endsOn !== null
      ? `, until ${event.endsOn}`
      : event.occurrenceLimit !== null
        ? `, ${event.occurrenceLimit} times`
        : '';

  return `${every} on ${on}, from ${event.startDate}${ends}`;
}

/**
 * The reader's own Characters, on every account, to answer as. An event may
 * be a Community's, across platforms, so none is left out; the server checks
 * each is theirs.
 *
 * @param accounts - Their accounts.
 * @returns Each Character, as Name@handle.
 */
export function eventCharactersOf(
  accounts: readonly SwitcherAccount[],
): RecruitmentCharacterOption[] {
  return accounts.flatMap(account =>
    account.characters.map(character => ({
      id: character.id,
      label: `${character.handle}@${account.handle}`,
    })),
  );
}

/**
 * Says what a line of an event's change log records.
 *
 * @param action - The line.
 * @returns Such as "Attendance of Kira recorded".
 */
export function fleetEventActionLabel(action: FleetEventAction): string {
  switch (action.action) {
    case 'CREATED':
      return 'Created';
    case 'EDITED':
      return 'Changed from then on';
    case 'CANCELLED':
      return 'Cancelled';
    case 'OCCURRENCE_CANCELLED':
      return 'One occurrence cancelled';
    case 'OCCURRENCE_MOVED':
      return 'One occurrence moved';
    case 'ATTENDANCE_RECORDED':
      return `Attendance of ${action.subjectName ?? 'somebody'} recorded`;
    case 'CLOSED_WITH_SCOPE':
      return 'Cancelled when its scope closed';
    default:
      return action.action;
  }
}
