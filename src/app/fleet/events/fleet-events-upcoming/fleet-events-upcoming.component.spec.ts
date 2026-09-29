import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetEventsService } from 'src/app/fleet/events/fleet-events.service';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetUpcoming } from 'src/app/models/fleet-events.models';

import {
  calendarEntry,
  EVENTS_READER_ZONE,
  EventsStub,
  eventsStub,
} from '../fleet-events.testing';
import {
  FleetEventsUpcomingComponent,
  FleetUpcomingSource,
} from './fleet-events-upcoming.component';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const COMMUNITY: FleetUpcomingSource = {
  kind: 'SCOPE',
  target: { communityId: 'community-1', fleetId: null, armadaId: null },
  calendarLink: ['/fleets', 'communities', 'ufa', 'events'],
};

describe('FleetEventsUpcomingComponent', () => {
  let fixture: ComponentFixture<FleetEventsUpcomingComponent>;
  let events: EventsStub;

  /**
   * Draws the list.
   *
   * @param source - Whose.
   * @param latest - How many to show.
   */
  async function render(
    source: FleetUpcomingSource,
    latest: number | null = null,
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FleetEventsUpcomingComponent],
      providers: [
        provideRouter([]),
        { provide: FleetEventsService, useValue: events },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => EVENTS_READER_ZONE },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetEventsUpcomingComponent);
    fixture.componentInstance.latest = latest;
    fixture.componentRef.setInput('source', source);
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
      text: link.textContent!.trim(),
      href: link.getAttribute('href'),
    }));

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    events = eventsStub();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists a Community’s next few still going ahead, with its calendar', async () => {
    events.calendar.mockReturnValue(
      of({
        from: '',
        to: '',
        mayManage: false,
        isOpen: true,
        entries: [
          calendarEntry({ id: 'first' }),
          calendarEntry({ id: 'off', status: 'CANCELLED' }),
          calendarEntry({ id: 'second' }, { title: 'Fleet Night' }),
          calendarEntry({ id: 'third' }, { title: 'Too far down' }),
        ],
      }),
    );

    await render(COMMUNITY, 2);

    expect(events.calendar).toHaveBeenCalledWith(
      COMMUNITY.kind === 'SCOPE' ? COMMUNITY.target : null,
      NOW.toISOString(),
      '2027-01-02T12:00:00.000Z',
    );
    expect(links()).toEqual([
      {
        text: 'Refit night',
        href: '/fleets/communities/ufa/events/event-1/occurrences/first',
      },
      {
        text: 'Fleet Night',
        href: '/fleets/communities/ufa/events/event-1/occurrences/second',
      },
      { text: 'The full calendar', href: '/fleets/communities/ufa/events' },
    ]);
  });

  it('says when nothing is on a scope’s calendar', async () => {
    events.calendar.mockReturnValue(
      of({ from: '', to: '', mayManage: false, isOpen: true, entries: [] }),
    );

    await render(COMMUNITY);

    expect(pageText(fixture)).toContain('Nothing is on the calendar.');
  });

  it('lists the reader’s own, naming each scope and their answer', async () => {
    const upcoming: FleetUpcoming = {
      entries: [
        {
          ...calendarEntry({
            id: 'going',
            mine: {
              response: 'GOING',
              characterId: null,
              waitlistPosition: null,
            },
          }),
          scope: {
            kind: 'FLEET',
            name: 'Ninth Fleet',
            path: '/fleets/communities/ufa/fleets/pc/ninth',
          },
        },
        {
          ...calendarEntry({
            id: 'waiting',
            mine: { response: 'GOING', characterId: null, waitlistPosition: 3 },
          }),
          scope: {
            kind: 'COMMUNITY',
            name: 'UFA',
            path: '/fleets/communities/ufa',
          },
        },
        {
          ...calendarEntry({ id: 'reminded' }),
          scope: {
            kind: 'COMMUNITY',
            name: 'UFA',
            path: '/fleets/communities/ufa',
          },
        },
      ],
    };

    events.mine.mockReturnValue(of(upcoming));

    await render({ kind: 'MINE' });

    const text = pageText(fixture);

    expect(text).toContain('Ninth Fleet');
    expect(text).toContain('Going');
    expect(text).toContain('Waiting, 3 in line');
    expect(links()[0]).toEqual({
      text: 'Refit night',
      href: '/fleets/communities/ufa/fleets/pc/ninth/events/event-1/occurrences/going',
    });
    expect(links().map(link => link.text)).not.toContain('The full calendar');
  });

  it('says when the reader has nothing coming up', async () => {
    events.mine.mockReturnValue(of({ entries: [] }));

    await render({ kind: 'MINE' });

    expect(pageText(fixture)).toContain(
      'Nothing you have answered or asked to be reminded of',
    );
  });

  it('says it is reading, and then when it could not', async () => {
    const answer = new Subject<FleetUpcoming>();

    events.mine.mockReturnValue(answer);

    await render({ kind: 'MINE' });

    expect(pageText(fixture)).toContain('Reading what is coming up');

    answer.error(new Error('down'));
    fixture.detectChanges();

    expect(pageText(fixture)).toContain('The events could not be read.');
  });

  it('reads again when given another source', async () => {
    events.mine.mockReturnValue(throwError(() => new Error('down')));
    events.calendar.mockReturnValue(
      of({ from: '', to: '', mayManage: false, isOpen: true, entries: [] }),
    );

    await render({ kind: 'MINE' });
    fixture.componentRef.setInput('source', COMMUNITY);
    fixture.detectChanges();

    expect(pageText(fixture)).toContain('Nothing is on the calendar.');
  });
});
