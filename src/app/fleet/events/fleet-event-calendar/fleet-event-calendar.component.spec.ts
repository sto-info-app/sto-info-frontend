import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ParamMap, Router } from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetCalendarEntry,
  FleetEventCalendar,
} from 'src/app/models/fleet-events.models';

import {
  calendarEntry,
  EventsReader,
  eventsRoute,
  EventsStub,
  eventsStub,
} from '../fleet-events.testing';
import { FleetEventCalendarComponent } from './fleet-event-calendar.component';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const FLEET_EVENTS =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/events';

describe('FleetEventCalendarComponent', () => {
  let fixture: ComponentFixture<FleetEventCalendarComponent>;
  let events: EventsStub;
  let query$: BehaviorSubject<ParamMap>;
  let navigate: jest.SpyInstance;

  /**
   * Draws the calendar.
   *
   * @param reader - Who is reading, where, and what the address asks.
   * @param calendar - What the server answers.
   */
  async function render(
    reader: EventsReader = { onFleet: true },
    calendar: Partial<FleetEventCalendar> = {},
  ): Promise<void> {
    events = eventsStub();
    events.calendar.mockReturnValue(
      of({
        from: '',
        to: '',
        entries: [],
        mayManage: false,
        isOpen: true,
        isSuspended: false,
        ...calendar,
      }),
    );

    const route = eventsRoute(reader, events);

    query$ = route.query$;
    await TestBed.configureTestingModule({
      imports: [FleetEventCalendarComponent],
      providers: route.providers,
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetEventCalendarComponent);
    fixture.detectChanges();
  }

  /**
   * The links shown.
   *
   * @returns Each link's text and address.
   */
  const links = (): { text: string; href: string | null }[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => ({
      text: link.textContent!.replace(/\s+/g, ' ').trim(),
      href: link.getAttribute('href'),
    }));

  /** A month's worth of entries to lay out. */
  const entries = (): FleetCalendarEntry[] => [
    calendarEntry({
      id: 'plain',
      counts: { going: 3, maybe: 1, waitlisted: 0, notGoing: null },
    }),
    calendarEntry(
      {
        id: 'waiting',
        startsAt: '2026-10-09T19:00:00.000Z',
        counts: { going: 10, maybe: 0, waitlisted: 2, notGoing: null },
        mine: { response: 'GOING', characterId: null, waitlistPosition: 2 },
      },
      { id: 'event-2', title: 'Fleet Night' },
    ),
    calendarEntry({
      id: 'answered',
      startsAt: '2026-10-16T19:00:00.000Z',
      mine: { response: 'MAYBE', characterId: null, waitlistPosition: null },
    }),
    calendarEntry({
      id: 'cancelled',
      startsAt: '2026-10-23T19:00:00.000Z',
      status: 'CANCELLED',
    }),
  ];

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads a week either side of this month, in a grid on a wide screen', async () => {
    await render({ onFleet: true }, { entries: entries() });

    expect(events.calendar).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: 'fleet-1' },
      '2026-09-24T00:00:00.000Z',
      '2026-11-08T00:00:00.000Z',
    );
    expect(pageText(fixture)).toContain('October 2026');
    expect(pageText(fixture)).toContain(
      'Times are in your zone, Europe/London.',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table'),
    ).not.toBeNull();
    expect(links()).toContainEqual({
      text: '20:00 Refit night',
      href: `${FLEET_EVENTS}/event-1/occurrences/plain`,
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[aria-current="date"]',
      )?.textContent,
    ).toContain('1');
    expect(pageText(fixture)).toContain('Cancelled');
    expect(findButton(fixture, 'Month')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('lists the month day by day on a narrow screen', async () => {
    window.matchMedia = jest.fn(() => ({ matches: true })) as never;

    await render({ onFleet: true }, { entries: entries() });

    const text = pageText(fixture);

    expect(text).toContain('Friday 2 October');
    expect(text).toContain('3 going · 1 maybe');
    expect(text).toContain('2 waiting');
    expect(text).toContain('Waiting, 2 in line');
    expect(text).toContain('Maybe');
    expect(text).toContain('Cancelled');
    expect(links()).toContainEqual({
      text: 'Fleet Night',
      href: `${FLEET_EVENTS}/event-2/occurrences/waiting`,
    });
  });

  it('draws the grid on a wide screen that asks', async () => {
    window.matchMedia = jest.fn(() => ({ matches: false })) as never;

    await render();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table'),
    ).not.toBeNull();
  });

  it('shows the view and month the address asks for', async () => {
    await render({
      onFleet: true,
      query: { view: 'agenda', month: '2027-02' },
    });

    expect(events.calendar).toHaveBeenCalledWith(
      expect.anything(),
      '2027-01-25T00:00:00.000Z',
      '2027-03-08T00:00:00.000Z',
    );
    expect(pageText(fixture)).toContain(
      'Nothing is on the calendar in February 2027.',
    );
  });

  it('keeps the view and month in the address', async () => {
    await render({ onFleet: true, query: { view: 'month', month: '2026-12' } });

    pressButton(fixture, 'Agenda');
    pressButton(fixture, 'Next month');
    pressButton(fixture, 'Previous month');
    pressButton(fixture, 'This month');

    const asked = navigate.mock.calls.map(([, extras]) => extras.queryParams);

    expect(asked).toEqual([
      { view: 'agenda' },
      { month: '2027-01' },
      { month: '2026-11' },
      { month: null },
    ]);
    expect(navigate.mock.calls[0][1]).toEqual(
      expect.objectContaining({ queryParamsHandling: 'merge' }),
    );
  });

  it('reads the calendar again when the address changes', async () => {
    await render();

    query$.next(convertToParamMap({ month: '2026-11' }));
    fixture.detectChanges();

    expect(events.calendar).toHaveBeenLastCalledWith(
      expect.anything(),
      '2026-10-25T00:00:00.000Z',
      '2026-12-08T00:00:00.000Z',
    );
  });

  it('offers its event managers a new event while it is open', async () => {
    await render({ onFleet: true }, { mayManage: true });

    expect(links()).toContainEqual({
      text: 'New event',
      href: `${FLEET_EVENTS}/new`,
    });
  });

  it('tells its event managers a closed calendar cannot change', async () => {
    await render({ onFleet: true }, { mayManage: true, isOpen: false });

    expect(pageText(fixture)).toContain('This is closed');
    expect(links().map(link => link.text)).not.toContain('New event');
  });

  it('tells its event managers a suspended calendar waits on reinstatement', async () => {
    await render(
      { onFleet: true },
      { mayManage: true, isOpen: false, isSuspended: true },
    );

    expect(pageText(fixture)).toContain('This is suspended');
    expect(pageText(fixture)).toContain('until it is reinstated');
    expect(pageText(fixture)).not.toContain('This is closed');
    expect(links().map(link => link.text)).not.toContain('New event');
  });

  it('leads a Community’s calendar back to the Community', async () => {
    await render({});

    expect(pageText(fixture)).toContain('Back to United Federation Alliance');
  });
});
