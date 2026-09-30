/** Who an event is for (FC-028). */
export type FleetEventAudience =
  'PUBLIC' | 'COMMUNITY' | 'MEMBERS' | 'OFFICERS' | 'SELECTED';

/** How an event repeats. */
export type FleetEventRecurrence =
  'NONE' | 'WEEKLY' | 'MONTHLY_DAY' | 'MONTHLY_WEEKDAY';

/** How daylight saving placed an occurrence. */
export type FleetOccurrenceAdjustment =
  'NONE' | 'REPEATED_TIME' | 'MISSING_TIME';

/** Whether an event is still running. */
export type FleetEventStatus = 'ACTIVE' | 'CANCELLED';

/** Whether an occurrence is going ahead. */
export type FleetOccurrenceStatus = 'SCHEDULED' | 'CANCELLED';

/** An answer to an occurrence. */
export type FleetRsvpResponse = 'GOING' | 'MAYBE' | 'NOT_GOING';

/** A role an event may be for. */
export type FleetEventRole = 'OWNER' | 'ADMIN' | 'OFFICER' | 'MEMBER';

/** How long before an occurrence a reminder comes, in minutes. */
export type FleetReminderLead = 15 | 60 | 1440;

/** Every reminder lead there is, soonest first. */
export const FLEET_REMINDER_LEADS: readonly FleetReminderLead[] = [
  15, 60, 1440,
];

/** How many answered each way. */
export interface FleetOccurrenceCounts {
  readonly going: number;
  readonly maybe: number;
  readonly waitlisted: number;
  /** For managers; null for anybody else. */
  readonly notGoing: number | null;
}

/** The reader's own answer. */
export interface FleetMyAnswer {
  readonly response: FleetRsvpResponse;
  readonly characterId: string | null;
  /** Their place on the waitlist, from 1, or null. */
  readonly waitlistPosition: number | null;
}

/** An event, as a calendar shows it. */
export interface FleetEventSummary {
  readonly id: string;
  readonly title: string;
  readonly audience: FleetEventAudience;
  readonly timezone: string;
  readonly capacity: number | null;
  readonly externalUrl: string | null;
  readonly status: FleetEventStatus;
  readonly recurrence: FleetEventRecurrence;
}

/** One occurrence, as a calendar shows it. */
export interface FleetOccurrenceSummary {
  readonly id: string;
  /** The day its rule names. */
  readonly key: string;
  /** On the event's clock, YYYY-MM-DDTHH:mm. */
  readonly localStart: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly adjustment: FleetOccurrenceAdjustment;
  readonly status: FleetOccurrenceStatus;
  /** When it was first due, once moved. */
  readonly movedFromStartsAt: string | null;
  readonly counts: FleetOccurrenceCounts;
  readonly mine: FleetMyAnswer | null;
}

/** One occurrence in a calendar, with its event. */
export interface FleetCalendarEntry {
  readonly event: FleetEventSummary;
  readonly occurrence: FleetOccurrenceSummary;
}

/** A stretch of a scope's calendar. */
export interface FleetEventCalendar {
  readonly from: string;
  readonly to: string;
  readonly entries: readonly FleetCalendarEntry[];
  /** Whether the reader holds events.manage. */
  readonly mayManage: boolean;
  /** Whether the scope is open. */
  readonly isOpen: boolean;
  /** Whether it is suspended rather than closed, when it is not open. */
  readonly isSuspended: boolean;
}

/** An event in full, with its rule and what lies ahead. */
export interface FleetEventDetail extends FleetEventSummary {
  readonly description: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly interval: number;
  readonly weekdays: readonly number[];
  readonly monthDay: number | null;
  readonly monthWeek: number | null;
  readonly monthWeekday: number | null;
  readonly endsOn: string | null;
  readonly occurrenceLimit: number | null;
  readonly durationMinutes: number;
  /** The chosen Fleets, for managers. */
  readonly audienceFleetIds: readonly string[];
  /** The chosen roles, for managers. */
  readonly audienceRoles: readonly FleetEventRole[];
  /** Up to the next ten occurrences, cancelled ones included. */
  readonly upcoming: readonly FleetOccurrenceSummary[];
  readonly myReminders: readonly FleetReminderLead[];
  readonly mayManage: boolean;
  readonly mayAnswer: boolean;
  readonly isOpen: boolean;
}

/** One person on an occurrence's list. */
export interface FleetOccurrencePerson {
  readonly userId: string;
  readonly username: string | null;
  readonly characterName: string | null;
  readonly response: FleetRsvpResponse;
  readonly waitlisted: boolean;
}

/** One person's recorded attendance. */
export interface FleetAttendance {
  readonly userId: string;
  readonly username: string | null;
  readonly attended: boolean;
  readonly characterName: string | null;
  readonly recordedAt: string;
}

/** One occurrence in full. */
export interface FleetOccurrenceDetail {
  readonly event: FleetEventSummary;
  readonly occurrence: FleetOccurrenceSummary;
  /** Who answered: for the scope's members and managers. */
  readonly people: readonly FleetOccurrencePerson[];
  readonly myAttendance: FleetAttendance | null;
  readonly mayAnswer: boolean;
  readonly mayManage: boolean;
}

/** An occurrence as a rule would place it, before saving. */
export interface FleetPreviewOccurrence {
  readonly key: string;
  readonly localStart: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly adjustment: FleetOccurrenceAdjustment;
}

/** What a rule comes to over the next twelve months. */
export interface FleetEventPreview {
  readonly timezone: string;
  readonly occurrences: readonly FleetPreviewOccurrence[];
  /** Months a monthly event skips, YYYY-MM. */
  readonly skippedMonths: readonly string[];
}

/** One change in an event's log. */
export interface FleetEventAction {
  readonly id: string;
  readonly action: string;
  readonly occurrenceId: string | null;
  readonly actorName: string | null;
  readonly subjectName: string | null;
  readonly detail: Record<string, unknown> | null;
  readonly createdAt: string;
}

/** An event as its organiser writes it. */
export interface FleetEventDefinition {
  readonly title: string;
  readonly description?: string;
  readonly externalUrl?: string | null;
  readonly audience: FleetEventAudience;
  readonly audienceFleetIds?: readonly string[];
  readonly audienceRoles?: readonly FleetEventRole[];
  readonly timezone?: string;
  readonly recurrence: FleetEventRecurrence;
  readonly startDate: string;
  readonly startTime: string;
  readonly interval?: number;
  readonly weekdays?: readonly number[];
  readonly monthDay?: number;
  readonly monthWeek?: number;
  readonly monthWeekday?: number;
  readonly endsOn?: string;
  readonly occurrenceLimit?: number;
  readonly durationMinutes: number;
  readonly capacity?: number | null;
}

/** Somebody a manager may record at an occurrence (FC-030). */
export interface FleetAttendanceCandidate {
  readonly userId: string;
  readonly username: string | null;
  /** How they answered, or null for a member who did not. */
  readonly response: FleetRsvpResponse | null;
}

/** What a manager records attendance from. */
export interface FleetAttendanceSheet {
  readonly records: readonly FleetAttendance[];
  /** Everybody who answered, then the scope's members who did not. */
  readonly candidates: readonly FleetAttendanceCandidate[];
}

/** The scope an occurrence on somebody's own list belongs to. */
export interface FleetUpcomingScope {
  readonly kind: 'COMMUNITY' | 'FLEET' | 'ARMADA';
  readonly name: string;
  /** Its page on the site. */
  readonly path: string;
}

/** One occurrence on somebody's own list. */
export interface FleetUpcomingEntry extends FleetCalendarEntry {
  readonly scope: FleetUpcomingScope;
}

/** Somebody's own next thirty days. */
export interface FleetUpcoming {
  readonly entries: readonly FleetUpcomingEntry[];
}
