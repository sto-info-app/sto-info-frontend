import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import {
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetAttendanceSheet,
  FleetOccurrenceDetail,
} from 'src/app/models/fleet-events.models';

import {
  EventsReader,
  eventsRoute,
  EventsStub,
  eventsStub,
  eventSummary,
  occurrenceDetail,
  occurrenceSummary,
} from '../fleet-events.testing';
import { FleetEventOccurrenceComponent } from './fleet-event-occurrence.component';

const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const BEFORE = new Date('2026-10-02T18:00:00.000Z');
const AFTER = new Date('2026-10-02T20:00:00.000Z');
const READER: EventsReader = {
  onFleet: true,
  signedIn: true,
  params: { eventId: 'event-1', occurrenceId: 'occurrence-1' },
};

describe('FleetEventOccurrenceComponent', () => {
  let fixture: ComponentFixture<FleetEventOccurrenceComponent>;
  let events: EventsStub;

  /**
   * Draws the occurrence.
   *
   * @param detail - What differs about it.
   * @param options - When it is read, the sheet, and the accounts' answer.
   */
  async function render(
    detail: Partial<FleetOccurrenceDetail> = {},
    options: {
      now?: Date;
      sheet?: FleetAttendanceSheet;
      accountsFail?: boolean;
    } = {},
  ): Promise<void> {
    jest.useFakeTimers({ now: options.now ?? BEFORE });
    events = eventsStub();
    events.occurrence.mockReturnValue(of(occurrenceDetail(detail)));
    events.attendance.mockReturnValue(
      of(options.sheet ?? { records: [], candidates: [] }),
    );
    await TestBed.configureTestingModule({
      imports: [FleetEventOccurrenceComponent],
      providers: [
        ...eventsRoute(READER, events).providers,
        ...(options.accountsFail
          ? [
              {
                provide: StoAccountService,
                useValue: {
                  getSwitcherList: () => throwError(() => new Error('down')),
                },
              },
            ]
          : []),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FleetEventOccurrenceComponent);
    fixture.detectChanges();
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows when it is and how many are going, and nothing more to a reader who may not answer', async () => {
    await render({
      event: eventSummary({ capacity: 10 }),
      occurrence: occurrenceSummary({
        counts: { going: 4, maybe: 1, waitlisted: 2, notGoing: null },
        adjustment: 'MISSING_TIME',
        movedFromStartsAt: '2026-10-01T19:00:00.000Z',
      }),
    });

    const text = pageText(fixture);

    expect(events.occurrence).toHaveBeenCalledWith(
      FLEET,
      'event-1',
      'occurrence-1',
    );
    expect(text).toContain('Refit night');
    expect(text).toContain('Fri 2 Oct 2026, 20:00–22:00');
    expect(text).toContain('4 going · 1 maybe');
    expect(text).toContain('2 waiting');
    expect(text).toContain('10 places');
    expect(text).toContain('Moved from');
    expect(text).toContain('starts later by the jump');
    expect(text).not.toContain('Your answer');
    expect(text).not.toContain('Who answered');
    expect(events.attendance).not.toHaveBeenCalled();
  });

  it.each([
    [
      { occurrence: occurrenceSummary({ status: 'CANCELLED' }) },
      'This occurrence was cancelled.',
    ],
    [
      { event: eventSummary({ status: 'CANCELLED' }) },
      'This event was cancelled.',
    ],
  ])('says when it will not happen', async (detail, said) => {
    await render({ ...detail, mayAnswer: true });

    expect(pageText(fixture)).toContain(said);
    expect(pageText(fixture)).not.toContain('Your answer');
  });

  it('lists who answered, by answer, for its members', async () => {
    await render({
      people: [
        {
          userId: 'u1',
          username: 'Kira',
          characterName: 'Kira@kira#1234',
          response: 'GOING',
          waitlisted: false,
        },
        {
          userId: 'u2',
          username: null,
          characterName: null,
          response: 'GOING',
          waitlisted: true,
        },
        {
          userId: 'u3',
          username: 'Odo',
          characterName: null,
          response: 'MAYBE',
          waitlisted: false,
        },
        {
          userId: 'u4',
          username: 'Quark',
          characterName: null,
          response: 'NOT_GOING',
          waitlisted: false,
        },
      ],
    });

    const text = pageText(fixture);

    expect(text).toContain('Going Kira, as Kira@kira#1234');
    expect(text).toContain('Waiting for a place, in order Somebody');
    expect(text).toContain('Maybe Odo');
    expect(text).toContain('Can’t go Quark');
  });

  it('lists only the groups somebody answered', async () => {
    await render({
      people: [
        {
          userId: 'u3',
          username: 'Odo',
          characterName: null,
          response: 'MAYBE',
          waitlisted: false,
        },
      ],
    });

    expect(pageText(fixture)).not.toContain('Waiting for a place');
  });

  describe('answering', () => {
    it('answers until it starts, and reads it again', async () => {
      await render({ mayAnswer: true });
      events.answer.mockReturnValue(of({}));

      pressButton(fixture, 'Going');

      expect(events.answer).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
        'GOING',
        null,
      );
      expect(events.occurrence).toHaveBeenCalledTimes(2);
    });

    it('takes an answer back', async () => {
      await render({
        mayAnswer: true,
        occurrence: occurrenceSummary({
          mine: {
            response: 'MAYBE',
            characterId: null,
            waitlistPosition: null,
          },
        }),
      });
      events.withdraw.mockReturnValue(of(undefined));

      pressButton(fixture, 'Take my answer back');

      expect(events.withdraw).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
      );
    });

    it('offers the reader’s Characters', async () => {
      await render({ mayAnswer: true });

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('select'),
      ).not.toBeNull();
    });

    it('answers without a Character when theirs cannot be read', async () => {
      await render({ mayAnswer: true }, { accountsFail: true });

      expect(pageText(fixture)).toContain('Your answer');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('select'),
      ).toBeNull();
    });

    it('takes no answer once it has started', async () => {
      await render({ mayAnswer: true }, { now: AFTER });

      expect(pageText(fixture)).not.toContain('Your answer');
    });
  });

  it.each([
    [
      true,
      'Kira@kira#1234',
      'You were recorded as having come, as Kira@kira#1234.',
    ],
    [false, null, 'You were recorded as not having come.'],
  ])(
    'tells the reader what was recorded of them',
    async (attended, characterName, said) => {
      await render({
        myAttendance: {
          userId: 'me',
          username: 'Me',
          attended,
          characterName,
          recordedAt: AFTER.toISOString(),
        },
      });

      expect(pageText(fixture)).toContain(said);
    },
  );

  describe('for its event managers', () => {
    const sheet: FleetAttendanceSheet = {
      records: [
        {
          userId: 'u1',
          username: 'Kira',
          attended: true,
          characterName: null,
          recordedAt: AFTER.toISOString(),
        },
        {
          userId: 'u2',
          username: 'Odo',
          attended: false,
          characterName: null,
          recordedAt: AFTER.toISOString(),
        },
      ],
      candidates: [
        { userId: 'u1', username: 'Kira', response: 'GOING' },
        { userId: 'u2', username: 'Odo', response: 'MAYBE' },
        { userId: 'u3', username: null, response: null },
      ],
    };

    it('records nobody before it starts', async () => {
      await render({ mayManage: true });

      expect(events.attendance).not.toHaveBeenCalled();
      expect(pageText(fixture)).not.toContain('Who came');
    });

    it('records nobody at a cancelled occurrence', async () => {
      await render(
        {
          mayManage: true,
          occurrence: occurrenceSummary({ status: 'CANCELLED' }),
        },
        { now: AFTER },
      );

      expect(events.attendance).not.toHaveBeenCalled();
    });

    it('lists everybody who may be recorded, with what was recorded', async () => {
      await render({ mayManage: true }, { now: AFTER, sheet });

      const text = pageText(fixture);

      expect(events.attendance).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
      );
      expect(text).toContain('Kira Going Came');
      expect(text).toContain('Odo Maybe Did not come');
      expect(text).toContain('Somebody Did not answer Not yet');
    });

    it('records whether somebody came, and reads it again', async () => {
      await render({ mayManage: true }, { now: AFTER, sheet });
      events.recordAttendance.mockReturnValue(of(undefined));

      (
        (fixture.nativeElement as HTMLElement).querySelector(
          'button[aria-label="Somebody came"]',
        ) as HTMLButtonElement
      ).click();
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          'button[aria-label="Kira did not come"]',
        ) as HTMLButtonElement
      ).click();

      expect(events.recordAttendance.mock.calls).toEqual([
        [FLEET, 'event-1', 'occurrence-1', 'u3', true],
        [FLEET, 'event-1', 'occurrence-1', 'u1', false],
      ]);
      expect(events.attendance).toHaveBeenCalledTimes(3);
    });

    it('finds people by name', async () => {
      await render({ mayManage: true }, { now: AFTER, sheet });

      typeInto(fixture, '#attendance-filter', ' od ');

      expect(pageText(fixture)).toContain('Odo');
      expect(pageText(fixture)).not.toContain('Kira');

      typeInto(fixture, '#attendance-filter', 'nobody');

      expect(pageText(fixture)).toContain('Nobody to record.');
      expect(findButton(fixture, 'Came')).toBeUndefined();
    });
  });
});
