import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetEventDetail } from 'src/app/models/fleet-events.models';

import {
  eventDetail,
  EventsReader,
  eventsRoute,
  EventsStub,
  eventsStub,
} from '../fleet-events.testing';
import { FleetEventEditorComponent } from './fleet-event-editor.component';

const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const COMMUNITY = { communityId: 'community-1', fleetId: null };
const FLEET_EVENTS =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/events';
const MANAGER: EventsReader = {
  onFleet: true,
  capabilities: ['events.manage'],
};

describe('FleetEventEditorComponent', () => {
  let fixture: ComponentFixture<FleetEventEditorComponent>;
  let events: EventsStub;
  let navigate: jest.SpyInstance;

  /**
   * Draws the editor.
   *
   * @param reader - Who is writing, and where.
   * @param event - The event being changed, when there is one.
   * @param structure - The Community's shape, for its Fleets.
   */
  async function render(
    reader: EventsReader = MANAGER,
    event: FleetEventDetail | null = null,
    structure: object = { armadas: [], standaloneFleets: [] },
  ): Promise<void> {
    events = eventsStub();
    events.detail.mockReturnValue(of(event));
    events.create.mockReturnValue(of(eventDetail({ id: 'event-new' })));
    events.update.mockReturnValue(of(event));
    await TestBed.configureTestingModule({
      imports: [FleetEventEditorComponent],
      providers: [
        ...eventsRoute(
          {
            ...reader,
            params: event === null ? {} : { eventId: event.id },
          },
          events,
        ).providers,
        {
          provide: FleetArmadaService,
          useValue: { communityStructure: jest.fn(() => of(structure)) },
        },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetEventEditorComponent);
    fixture.detectChanges();
  }

  /**
   * Ticks or unticks a box by its label.
   *
   * @param label - The label's words.
   */
  function tick(label: string): void {
    const box = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('label'),
    )
      .find(each => each.textContent!.trim() === label)!
      .querySelector('input') as HTMLInputElement;

    box.click();
    fixture.detectChanges();
  }

  /** Fills in what every event needs. */
  function fillIn(): void {
    typeInto(fixture, '#event-title', '  Refit night  ');
    typeInto(fixture, '#event-start-date', '2026-10-02');
  }

  /**
   * What was sent to be saved.
   *
   * @returns The definition.
   */
  const created = (): unknown => events.create.mock.calls[0][1];

  it.each([
    ['somebody who does not run its events', { onFleet: true }],
    ['a closed calendar', { ...MANAGER, closed: true }],
  ])('is not open to %s', async (_label, reader) => {
    await render(reader);

    expect(pageText(fixture)).toContain(
      'Only this calendar’s event managers can write its events',
    );
  });

  it('creates a one-off with only what it needs, then opens it', async () => {
    await render();

    expect(pageText(fixture)).toContain('New event');
    expect(findButton(fixture, 'Create the event')?.disabled).toBe(true);
    fillIn();
    pressButton(fixture, 'Create the event');

    expect(events.create).toHaveBeenCalledWith(FLEET, {
      title: 'Refit night',
      description: '',
      externalUrl: null,
      audience: 'PUBLIC',
      recurrence: 'NONE',
      startDate: '2026-10-02',
      startTime: '20:00',
      durationMinutes: 120,
      capacity: null,
    });
    expect(navigate).toHaveBeenCalledWith([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'fleets',
      'pc',
      'ninth-fleet',
      'events',
      'event-new',
    ]);
  });

  it('saves nothing without a title, even when the form is submitted', async () => {
    await render();

    typeInto(fixture, '#event-start-date', '2026-10-02');
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));

    expect(events.create).not.toHaveBeenCalled();
  });

  it('writes a weekly rule, its days in order, ending after a number of times', async () => {
    await render();

    fillIn();
    tick('Weekly');
    typeInto(fixture, '#event-interval', '2');
    tick('Friday');
    tick('Monday');
    tick('Sunday');
    tick('Sunday');
    tick('After a number of times');
    typeInto(fixture, '#event-limit', '6');
    typeInto(fixture, '#event-duration', '90');
    typeInto(fixture, '#event-capacity', '25');
    typeInto(fixture, '#event-link', ' https://discord.gg/x ');
    typeInto(fixture, '#event-description', 'Bring a friend');
    chooseFrom(fixture, '#event-timezone', 'Europe/Berlin');
    pressButton(fixture, 'Create the event');

    expect(created()).toEqual({
      title: 'Refit night',
      description: 'Bring a friend',
      externalUrl: 'https://discord.gg/x',
      audience: 'PUBLIC',
      timezone: 'Europe/Berlin',
      recurrence: 'WEEKLY',
      startDate: '2026-10-02',
      startTime: '20:00',
      interval: 2,
      weekdays: [1, 5],
      occurrenceLimit: 6,
      durationMinutes: 90,
      capacity: 25,
    });
  });

  it('writes a monthly day, ending on a day', async () => {
    await render();

    fillIn();
    tick('Monthly, on a day');
    typeInto(fixture, '#event-month-day', '31');
    tick('On a day');
    typeInto(fixture, '#event-ends-on', '2027-06-01');
    pressButton(fixture, 'Create the event');

    expect(created()).toEqual(
      expect.objectContaining({
        recurrence: 'MONTHLY_DAY',
        interval: 1,
        monthDay: 31,
        endsOn: '2027-06-01',
      }),
    );
    expect(pageText(fixture)).toContain('A month without that day is skipped');
  });

  it('writes a monthly weekday that never ends', async () => {
    await render();

    fillIn();
    tick('Monthly, on a weekday');
    chooseFrom(fixture, '#event-month-week', '-1');
    chooseFrom(fixture, '#event-month-weekday', '5');
    tick('Never');
    pressButton(fixture, 'Create the event');

    expect(created()).toEqual(
      expect.objectContaining({
        recurrence: 'MONTHLY_WEEKDAY',
        monthWeek: -1,
        monthWeekday: 5,
      }),
    );
    expect(created()).not.toHaveProperty('endsOn');
    expect(created()).not.toHaveProperty('occurrenceLimit');
  });

  it('chooses roles for a Fleet’s own event, offering no Fleets', async () => {
    await render();

    fillIn();
    chooseFrom(fixture, '#event-audience', 'SELECTED');
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('legend'),
      ).map(legend => legend.textContent!.trim()),
    ).not.toContain('Chosen Fleets');
    tick('Officers');
    tick('Admins');
    tick('Admins');
    pressButton(fixture, 'Create the event');

    expect(created()).toEqual(
      expect.objectContaining({
        audience: 'SELECTED',
        audienceFleetIds: [],
        audienceRoles: ['OFFICER'],
      }),
    );
  });

  it('offers a Community’s event every Fleet it holds, by name', async () => {
    const ref = (id: string | null, name: string | null) => ({
      id,
      name,
      slug: 'x',
      platformSegment: 'pc',
    });

    await render({ capabilities: ['events.manage'] }, null, {
      standaloneFleets: [ref('f-zulu', 'Zulu Fleet'), ref(null, null)],
      armadas: [
        {
          armada: {},
          structure: {
            alpha: { fleet: ref('f-alpha', 'Alpha Fleet') },
            betas: [
              {
                fleet: ref('f-beta', 'Beta Fleet'),
                gammas: [{ fleet: ref('f-gamma', 'Gamma Fleet') }],
              },
            ],
          },
        },
        { armada: {}, structure: { alpha: null, betas: [] } },
      ],
    });

    fillIn();
    chooseFrom(fixture, '#event-audience', 'SELECTED');

    const text = pageText(fixture);

    expect(text.indexOf('Alpha Fleet')).toBeLessThan(
      text.indexOf('Beta Fleet'),
    );
    expect(text.indexOf('Gamma Fleet')).toBeLessThan(
      text.indexOf('Zulu Fleet'),
    );
    tick('Gamma Fleet');
    pressButton(fixture, 'Create the event');

    expect(events.create).toHaveBeenCalledWith(
      COMMUNITY,
      expect.objectContaining({ audienceFleetIds: ['f-gamma'] }),
    );
  });

  it('shows what a rule comes to before it is saved', async () => {
    await render();
    events.preview.mockReturnValue(
      of({
        timezone: 'Europe/London',
        skippedMonths: ['2027-02'],
        occurrences: [
          {
            key: '2026-10-25',
            localStart: '2026-10-25T01:30',
            startsAt: '2026-10-25T00:30:00.000Z',
            endsAt: '2026-10-25T02:30:00.000Z',
            adjustment: 'REPEATED_TIME',
          },
        ],
      }),
    );

    fillIn();
    pressButton(fixture, 'Show what it comes to');

    const text = pageText(fixture);

    expect(events.preview).toHaveBeenCalledWith(
      FLEET,
      expect.objectContaining({ title: 'Refit night' }),
    );
    expect(text).toContain('Over the next year, on the Europe/London clock');
    expect(text).toContain('Skipped, having no such day: 2027-02');
    expect(text).toContain('1 occurrence');
    expect(text).toContain('2026-10-25 01:30');
    expect(text).toContain('it is the first of the two');
  });

  it('says when nothing of a rule lies ahead', async () => {
    await render();
    events.preview.mockReturnValue(
      of({ timezone: 'Europe/London', skippedMonths: [], occurrences: [] }),
    );

    fillIn();
    pressButton(fixture, 'Show what it comes to');

    expect(pageText(fixture)).toContain('Nothing of this lies ahead.');
  });

  it('counts several occurrences in the plural', async () => {
    await render();
    const occurrence = {
      localStart: '2026-10-02T20:00',
      startsAt: '2026-10-02T19:00:00.000Z',
      endsAt: '2026-10-02T21:00:00.000Z',
      adjustment: 'NONE' as const,
    };

    events.preview.mockReturnValue(
      of({
        timezone: 'Europe/London',
        skippedMonths: [],
        occurrences: [
          { ...occurrence, key: 'a' },
          { ...occurrence, key: 'b' },
        ],
      }),
    );

    fillIn();
    pressButton(fixture, 'Show what it comes to');

    expect(pageText(fixture)).toContain('2 occurrences');
  });

  it('says why a save was refused', async () => {
    await render();
    events.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Choose at least one weekday.' },
          }),
      ),
    );

    fillIn();
    pressButton(fixture, 'Create the event');

    expect(pageText(fixture)).toContain('Choose at least one weekday.');
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('changing an event', () => {
    const existing = eventDetail({
      id: 'event-1',
      title: 'Fleet Night',
      description: 'Weekly',
      externalUrl: 'https://discord.gg/x',
      audience: 'SELECTED',
      audienceRoles: ['OFFICER'],
      timezone: 'Europe/Berlin',
      recurrence: 'WEEKLY',
      interval: 2,
      weekdays: [5],
      occurrenceLimit: 10,
      capacity: 30,
      durationMinutes: 90,
    });

    it('fills the form from the event and saves it from now on', async () => {
      await render(MANAGER, existing);

      expect(pageText(fixture)).toContain('Change an event');
      expect(pageText(fixture)).toContain('Changes apply from now on.');
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '#event-title',
          ) as HTMLInputElement
        ).value,
      ).toBe('Fleet Night');

      pressButton(fixture, 'Save from now on');

      expect(events.update).toHaveBeenCalledWith(FLEET, 'event-1', {
        title: 'Fleet Night',
        description: 'Weekly',
        externalUrl: 'https://discord.gg/x',
        audience: 'SELECTED',
        audienceFleetIds: [],
        audienceRoles: ['OFFICER'],
        timezone: 'Europe/Berlin',
        recurrence: 'WEEKLY',
        startDate: '2026-10-02',
        startTime: '20:00',
        interval: 2,
        weekdays: [5],
        occurrenceLimit: 10,
        durationMinutes: 90,
        capacity: 30,
      });
      expect(navigate).toHaveBeenCalledWith([
        ...FLEET_EVENTS.split('/')
          .filter(Boolean)
          .map((part, index) => (index === 0 ? `/${part}` : part)),
        'event-1',
      ]);
    });

    it.each([
      [{ endsOn: '2027-01-01' }, 'ON'],
      [
        {
          monthDay: 3,
          monthWeek: 2,
          monthWeekday: 4,
          recurrence: 'MONTHLY_WEEKDAY' as const,
        },
        'NEVER',
      ],
    ])('reads how it ends', async (rule, ends) => {
      await render(
        MANAGER,
        eventDetail({ id: 'event-1', ...rule, externalUrl: null }),
      );

      expect(fixture.componentInstance.ends()).toBe(ends);
    });

    it('keeps what has been typed when the event is read again', async () => {
      await render(MANAGER, existing);

      typeInto(fixture, '#event-title', 'Renamed');
      fixture.componentInstance.reload();
      fixture.detectChanges();

      expect(fixture.componentInstance.title()).toBe('Renamed');
    });

    it('goes back to the event on Cancel', async () => {
      await render(MANAGER, existing);

      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('a.lcars-btn')
          ?.getAttribute('href'),
      ).toBe(`${FLEET_EVENTS}/event-1`);
    });
  });

  it('goes back to the calendar on Cancel for a new event', async () => {
    await render();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('a.lcars-btn')
        ?.getAttribute('href'),
    ).toBe(FLEET_EVENTS);
  });
});
