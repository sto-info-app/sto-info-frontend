import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import {
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetEventDetail } from 'src/app/models/fleet-events.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  eventDetail,
  EventsReader,
  eventsRoute,
  EventsStub,
  eventsStub,
  occurrenceSummary,
} from '../fleet-events.testing';
import { FleetEventDetailComponent } from './fleet-event-detail.component';

const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const EVENT_PAGE =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/events/event-1';

describe('FleetEventDetailComponent', () => {
  let fixture: ComponentFixture<FleetEventDetailComponent>;
  let events: EventsStub;
  let confirm: ConfirmPromptDouble;

  /**
   * Draws the event.
   *
   * @param event - What differs about it.
   * @param reader - Who is reading.
   */
  async function render(
    event: Partial<FleetEventDetail> = {},
    reader: EventsReader = { onFleet: true, params: { eventId: 'event-1' } },
  ): Promise<void> {
    events = eventsStub();
    events.detail.mockReturnValue(of(eventDetail(event)));
    confirm = stubConfirmPrompt();
    await TestBed.configureTestingModule({
      imports: [FleetEventDetailComponent],
      providers: [...eventsRoute(reader, events).providers, confirm.provider],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetEventDetailComponent);
    fixture.detectChanges();
  }

  /** A signed-in reader on the Fleet's event. */
  const signedIn: EventsReader = {
    onFleet: true,
    signedIn: true,
    params: { eventId: 'event-1' },
  };

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

  it('shows the event, its rule and who it is for', async () => {
    await render({
      title: 'Fleet Night',
      recurrence: 'WEEKLY',
      weekdays: [5],
      capacity: 20,
      externalUrl: 'https://discord.gg/example',
      description: '**Bring** a friend',
    });

    const text = pageText(fixture);

    expect(events.detail).toHaveBeenCalledWith(FLEET, 'event-1');
    expect(text).toContain('Fleet Night');
    expect(text).toContain(
      'Every week on Friday, from 2026-10-02, on the Europe/London clock',
    );
    expect(text).toContain('Anyone');
    expect(text).toContain('20, then a waitlist');
    expect(text).toContain('120 minutes');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('strong')
        ?.textContent,
    ).toBe('Bring');
    expect(links()).toContainEqual({
      text: 'https://discord.gg/example',
      href: 'https://discord.gg/example',
    });
    expect(links()).toContainEqual({
      text: 'Back to the calendar',
      href: EVENT_PAGE.replace('/event-1', ''),
    });
  });

  // Plan §11.7 (FC-043): an organiser's link opens away from the site,
  // with no handle back to it and no address passed on.
  it('opens the event’s own link apart, telling it nothing', async () => {
    await render({ externalUrl: 'https://discord.gg/example' });

    const link = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).find(
      anchor => anchor.getAttribute('href') === 'https://discord.gg/example',
    );

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')?.split(' ').sort()).toEqual([
      'noopener',
      'noreferrer',
    ]);
  });

  it('shows a signed-out reader what lies ahead, and nothing to answer', async () => {
    await render({
      upcoming: [
        occurrenceSummary({
          counts: { going: 4, maybe: 2, waitlisted: 1, notGoing: null },
          movedFromStartsAt: '2026-10-01T19:00:00.000Z',
          adjustment: 'REPEATED_TIME',
        }),
      ],
    });

    const text = pageText(fixture);

    expect(text).toContain('No limit');
    expect(text).toContain('4 going · 2 maybe');
    expect(text).toContain('1 waiting');
    expect(text).toContain('Moved from');
    expect(text).toContain('it is the first of the two');
    expect(text).not.toContain('Remind me');
    expect(text).not.toContain('Your answer');
    expect(links()).toContainEqual(
      expect.objectContaining({
        href: `${EVENT_PAGE}/occurrences/occurrence-1`,
      }),
    );
    expect(
      TestBed.inject(StoAccountService).getSwitcherList,
    ).not.toHaveBeenCalled();
  });

  it('says so when nothing lies ahead of a cancelled event', async () => {
    await render({ status: 'CANCELLED', upcoming: [] });

    expect(pageText(fixture)).toContain('This event was cancelled.');
    expect(pageText(fixture)).toContain('Nothing of this event lies ahead.');
  });

  it('shows a cancelled occurrence without asking for an answer', async () => {
    await render(
      {
        mayAnswer: true,
        upcoming: [occurrenceSummary({ status: 'CANCELLED' })],
      },
      signedIn,
    );

    expect(pageText(fixture)).toContain('Cancelled');
    expect(pageText(fixture)).not.toContain('Your answer');
  });

  describe('answering', () => {
    beforeEach(async () => {
      await render({ mayAnswer: true }, signedIn);
      events.answer.mockReturnValue(of({}));
      events.withdraw.mockReturnValue(of(undefined));
    });

    it('answers as one of the reader’s own Characters, and reads it again', async () => {
      const select = (fixture.nativeElement as HTMLElement).querySelector(
        'select',
      )!;

      select.value = 'character-1';
      select.dispatchEvent(new Event('change'));
      pressButton(fixture, 'Going');

      expect(events.answer).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
        'GOING',
        'character-1',
      );
      expect(events.detail).toHaveBeenCalledTimes(2);
    });

    it('says why an answer was refused', () => {
      events.answer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'This occurrence has started.' },
            }),
        ),
      );

      pressButton(fixture, 'Maybe');

      expect(pageText(fixture)).toContain('This occurrence has started.');
    });
  });

  it('takes an answer back', async () => {
    await render(
      {
        mayAnswer: true,
        upcoming: [
          occurrenceSummary({
            mine: {
              response: 'GOING',
              characterId: null,
              waitlistPosition: null,
            },
          }),
        ],
      },
      signedIn,
    );
    events.withdraw.mockReturnValue(of(undefined));

    pressButton(fixture, 'Take my answer back');

    expect(events.withdraw).toHaveBeenCalledWith(
      FLEET,
      'event-1',
      'occurrence-1',
    );
  });

  it('answers without a Character when the reader’s cannot be read', async () => {
    TestBed.resetTestingModule();
    events = eventsStub();
    events.detail.mockReturnValue(of(eventDetail({ mayAnswer: true })));
    await TestBed.configureTestingModule({
      imports: [FleetEventDetailComponent],
      providers: [
        ...eventsRoute(signedIn, events).providers,
        {
          provide: StoAccountService,
          useValue: {
            getSwitcherList: () => throwError(() => new Error('down')),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FleetEventDetailComponent);
    fixture.detectChanges();

    expect(pageText(fixture)).toContain('Your answer');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('select'),
    ).toBeNull();
  });

  describe('reminders', () => {
    it('asks for the leads ticked, soonest first', async () => {
      await render({}, signedIn);
      events.remind.mockReturnValue(of([15, 1440]));

      for (const label of ['A day before', '15 minutes before']) {
        const box = Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll('label'),
        )
          .find(each => each.textContent!.includes(label))!
          .querySelector('input')!;

        box.click();
      }
      fixture.detectChanges();
      pressButton(fixture, 'Save reminders');

      expect(events.remind).toHaveBeenCalledWith(FLEET, 'event-1', [15, 1440]);
    });

    it('stops reminding once every lead is unticked', async () => {
      await render({ myReminders: [60] }, signedIn);
      events.stopReminding.mockReturnValue(of(undefined));

      const box = (fixture.nativeElement as HTMLElement).querySelector(
        'input[type="checkbox"]:checked',
      ) as HTMLInputElement;

      box.click();
      fixture.detectChanges();
      pressButton(fixture, 'Stop reminding me');

      expect(events.stopReminding).toHaveBeenCalledWith(FLEET, 'event-1');
    });
  });

  describe('for its event managers', () => {
    const manager = {
      mayManage: true,
      upcoming: [
        occurrenceSummary({
          counts: { going: 1, maybe: 0, waitlisted: 0, notGoing: 3 },
        }),
      ],
    };

    it('offers changes from now on, and counts who can’t go', async () => {
      await render(manager);

      expect(links()).toContainEqual({
        text: 'Change from now on',
        href: `${EVENT_PAGE}/edit`,
      });
      expect(pageText(fixture)).toContain('3 can’t go');
    });

    it('cancels the event once asked', async () => {
      await render(manager);
      events.cancel.mockReturnValue(of(undefined));

      pressButton(fixture, 'Cancel the event');

      expect(confirm.lastAsked()?.title).toBe('Cancel this event?');
      expect(events.cancel).toHaveBeenCalledWith(FLEET, 'event-1');
    });

    it('cancels nothing when told not to', async () => {
      await render(manager);
      confirm.answer(false);

      pressButton(fixture, 'Cancel this one');

      expect(events.cancelOccurrence).not.toHaveBeenCalled();
    });

    it('cancels one occurrence once asked', async () => {
      await render(manager);
      events.cancelOccurrence.mockReturnValue(of(undefined));

      pressButton(fixture, 'Cancel this one');

      expect(events.cancelOccurrence).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
      );
    });

    it('moves one occurrence to a day and time on the event’s clock', async () => {
      await render(manager);
      events.moveOccurrence.mockReturnValue(of(undefined));

      pressButton(fixture, 'Move this one');

      const date = (fixture.nativeElement as HTMLElement).querySelector(
        '#move-date-occurrence-1',
      ) as HTMLInputElement;

      expect(date.value).toBe('2026-10-02');
      typeInto(fixture, '#move-date-occurrence-1', '2026-10-03');
      typeInto(fixture, '#move-time-occurrence-1', '19:30');
      pressButton(fixture, 'Move it');

      expect(events.moveOccurrence).toHaveBeenCalledWith(
        FLEET,
        'event-1',
        'occurrence-1',
        '2026-10-03',
        '19:30',
      );
      expect(findButton(fixture, 'Move it')).toBeUndefined();
    });

    it('puts the move away again', async () => {
      await render(manager);

      pressButton(fixture, 'Move this one');
      pressButton(fixture, 'Never mind');

      expect(findButton(fixture, 'Move it')).toBeUndefined();
    });

    it('reads the change log on asking', async () => {
      await render(manager);
      events.history.mockReturnValue(
        of([
          {
            id: 'a1',
            action: 'CREATED',
            occurrenceId: null,
            actorName: 'Kira',
            subjectName: null,
            detail: null,
            createdAt: '2026-09-28T12:00:00.000Z',
          },
          {
            id: 'a2',
            action: 'CLOSED_WITH_SCOPE',
            occurrenceId: null,
            actorName: null,
            subjectName: null,
            detail: null,
            createdAt: '2026-09-29T12:00:00.000Z',
          },
        ]),
      );

      pressButton(fixture, 'Show the change log');

      expect(pageText(fixture)).toContain('Created by Kira');
      expect(pageText(fixture)).toContain('Cancelled when its scope closed');
    });

    it('says when nothing has changed', async () => {
      await render(manager);
      events.history.mockReturnValue(of([]));

      pressButton(fixture, 'Show the change log');

      expect(pageText(fixture)).toContain('Nothing has changed yet.');
    });

    it('offers no changes on a closed calendar', async () => {
      await render({ ...manager, isOpen: false });

      expect(links().map(link => link.text)).not.toContain(
        'Change from now on',
      );
      expect(findButton(fixture, 'Move this one')).toBeUndefined();
    });
  });

  it('words an Armada’s event for the Armada, and cancels it there', async () => {
    await render(
      { audience: 'MEMBERS', mayManage: true },
      { onArmada: true, params: { eventId: 'event-1' } },
    );

    expect(pageText(fixture)).toContain('Members of the Armada');

    pressButton(fixture, 'Cancel the event');

    expect(events.cancel).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: null, armadaId: 'armada-1' },
      'event-1',
    );
  });
});
