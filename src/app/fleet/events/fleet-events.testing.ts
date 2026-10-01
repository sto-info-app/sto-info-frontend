import { EnvironmentProviders, Provider } from '@angular/core';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetEventsService } from 'src/app/fleet/events/fleet-events.service';
import {
  GovernanceReader,
  governanceRoute,
} from 'src/app/fleet/governance/governance.testing';
import {
  FleetCalendarEntry,
  FleetEventDetail,
  FleetEventSummary,
  FleetOccurrenceDetail,
  FleetOccurrenceSummary,
} from 'src/app/models/fleet-events.models';

/** Who is reading an events page, where, and what the address asks. */
export interface EventsReader extends GovernanceReader {
  /** Whether they are signed in. */
  readonly signedIn?: boolean;
  /** The address's own parameters, such as the event. */
  readonly params?: Record<string, string>;
  /** The address's query. */
  readonly query?: Record<string, string>;
}

/** The zone every events spec reads times in. */
export const EVENTS_READER_ZONE = 'Europe/London';

/** A stand-in for the events client: every call answers with nothing. */
export type EventsStub = Record<keyof FleetEventsService, jest.Mock>;

/**
 * Builds a stand-in for the events client.
 *
 * @returns Each method, answering an empty observable until told otherwise.
 */
export function eventsStub(): EventsStub {
  const methods: (keyof FleetEventsService)[] = [
    'calendar',
    'detail',
    'occurrence',
    'mine',
    'preview',
    'create',
    'update',
    'cancel',
    'history',
    'remind',
    'stopReminding',
    'cancelOccurrence',
    'moveOccurrence',
    'answer',
    'withdraw',
    'attendance',
    'recordAttendance',
  ];

  return Object.fromEntries(
    methods.map(method => [method, jest.fn(() => of(undefined))]),
  ) as EventsStub;
}

/**
 * Resolves an events page's scope, as the governance pages are resolved,
 * with the address's own parameters and query, the reader's zone and
 * accounts, and the events client given. The editor adds the Community's
 * shape itself.
 *
 * @param reader - Who is reading, where, and what the address asks.
 * @param events - The events client's stand-in.
 * @returns The providers, and the address's query to change.
 */
export function eventsRoute(
  reader: EventsReader,
  events: object,
): {
  providers: (Provider | EnvironmentProviders)[];
  query$: BehaviorSubject<ParamMap>;
} {
  const route = governanceRoute(reader, {});
  const base = route.params$.value;
  const params = convertToParamMap({
    ...Object.fromEntries(base.keys.map(key => [key, base.get(key)])),
    ...reader.params,
  });
  const params$ = new BehaviorSubject<ParamMap>(params);
  const query$ = new BehaviorSubject<ParamMap>(
    convertToParamMap(reader.query ?? {}),
  );

  const providers: (Provider | EnvironmentProviders)[] = [
    ...route.providers,
    { provide: FleetEventsService, useValue: events },
    {
      provide: AuthService,
      useValue: {
        isLoggedInAsAdmin: () => false,
        isLoggedIn: () => reader.signedIn ?? false,
      },
    },
    {
      provide: UserSettingsService,
      useValue: { displayTimezone: () => EVENTS_READER_ZONE },
    },
    {
      provide: StoAccountService,
      useValue: {
        getSwitcherList: jest.fn(() =>
          of([
            {
              handle: 'kira#1234',
              characters: [{ id: 'character-1', handle: 'Kira' }],
            },
          ]),
        ),
      },
    },
    {
      provide: ActivatedRoute,
      useValue: {
        paramMap: params$,
        queryParamMap: query$,
        snapshot: {
          data: reader.onArmada ? { governs: 'ARMADA' } : {},
          paramMap: params,
          get queryParamMap() {
            return query$.value;
          },
        },
      },
    },
  ];

  return { providers, query$ };
}

/**
 * Builds an event as a calendar shows it.
 *
 * @param overrides - What differs from a public one-off.
 * @returns The event.
 */
export function eventSummary(
  overrides: Partial<FleetEventSummary> = {},
): FleetEventSummary {
  return {
    id: 'event-1',
    title: 'Refit night',
    audience: 'PUBLIC',
    timezone: 'Europe/London',
    capacity: null,
    externalUrl: null,
    status: 'ACTIVE',
    recurrence: 'NONE',
    ...overrides,
  };
}

/**
 * Builds an occurrence as a calendar shows it.
 *
 * @param overrides - What differs from one on Friday 2 October 2026.
 * @returns The occurrence.
 */
export function occurrenceSummary(
  overrides: Partial<FleetOccurrenceSummary> = {},
): FleetOccurrenceSummary {
  return {
    id: 'occurrence-1',
    key: '2026-10-02',
    localStart: '2026-10-02T20:00',
    startsAt: '2026-10-02T19:00:00.000Z',
    endsAt: '2026-10-02T21:00:00.000Z',
    adjustment: 'NONE',
    status: 'SCHEDULED',
    movedFromStartsAt: null,
    counts: { going: 0, maybe: 0, waitlisted: 0, notGoing: null },
    mine: null,
    ...overrides,
  };
}

/**
 * Builds a calendar entry.
 *
 * @param occurrence - What differs about the occurrence.
 * @param event - What differs about the event.
 * @returns The entry.
 */
export function calendarEntry(
  occurrence: Partial<FleetOccurrenceSummary>,
  event: Partial<FleetEventSummary> = {},
): FleetCalendarEntry {
  return {
    event: eventSummary(event),
    occurrence: occurrenceSummary(occurrence),
  };
}

/**
 * Builds an event in full.
 *
 * @param overrides - What differs from a public one-off with one occurrence
 *   ahead.
 * @returns The event.
 */
export function eventDetail(
  overrides: Partial<FleetEventDetail>,
): FleetEventDetail {
  return {
    ...eventSummary(),
    description: '',
    startDate: '2026-10-02',
    startTime: '20:00',
    interval: 1,
    weekdays: [],
    monthDay: null,
    monthWeek: null,
    monthWeekday: null,
    endsOn: null,
    occurrenceLimit: null,
    durationMinutes: 120,
    audienceFleetIds: [],
    audienceRoles: [],
    upcoming: [occurrenceSummary()],
    myReminders: [],
    mayManage: false,
    mayAnswer: false,
    isOpen: true,
    ...overrides,
  };
}

/**
 * Builds an occurrence in full.
 *
 * @param overrides - What differs from one nobody answered.
 * @returns The occurrence.
 */
export function occurrenceDetail(
  overrides: Partial<FleetOccurrenceDetail>,
): FleetOccurrenceDetail {
  return {
    event: eventSummary(),
    occurrence: occurrenceSummary(),
    people: [],
    myAttendance: null,
    mayAnswer: false,
    mayManage: false,
    ...overrides,
  };
}
