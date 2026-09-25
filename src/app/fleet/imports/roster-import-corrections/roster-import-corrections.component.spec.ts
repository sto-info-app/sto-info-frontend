import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { textOf } from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportActionKind,
  RosterImportDetail,
  RosterImportStatus,
} from 'src/app/models/fleet-import.models';

import {
  ROSTER_IMPORT_CORRECTION_FAILED,
  RosterImportCorrectionsComponent,
} from './roster-import-corrections.component';

/**
 * An import as an investigator sees it.
 *
 * @param overrides - Fields to change.
 * @returns The import: in force, complete, read through London.
 */
function detail(
  overrides: Partial<RosterImportDetail> = {},
): RosterImportDetail {
  return {
    id: 'import-1',
    status: RosterImportStatus.IMPORTED,
    excluded: false,
    partial: false,
    conflictGroupId: null,
    exportTimezone: 'Europe/London',
    exportLocalStamp: '2024-12-01T12:00:00',
    actions: [],
    ...overrides,
  } as RosterImportDetail;
}

describe('RosterImportCorrectionsComponent', () => {
  let fixture: ComponentFixture<RosterImportCorrectionsComponent>;
  let imports: {
    setExcluded: jest.Mock;
    setPartial: jest.Mock;
    correctTimezone: jest.Mock;
  };
  let corrected: RosterImportDetail[];

  beforeEach(async () => {
    imports = {
      setExcluded: jest.fn(() => of(detail({ excluded: true }))),
      setPartial: jest.fn(() => of(detail({ partial: true }))),
      correctTimezone: jest.fn(() => of(detail())),
    };

    await TestBed.configureTestingModule({
      imports: [RosterImportCorrectionsComponent],
      providers: [
        provideRouter([]),
        { provide: RosterImportService, useValue: imports },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
      ],
    }).compileComponents();
  });

  /**
   * Draws the panel.
   *
   * @param shown - The import.
   */
  function render(shown: RosterImportDetail = detail()): void {
    fixture = TestBed.createComponent(RosterImportCorrectionsComponent);
    fixture.componentRef.setInput('communityId', 'community-1');
    fixture.componentRef.setInput('fleetId', 'fleet-1');
    fixture.componentRef.setInput('detail', shown);
    fixture.componentRef.setInput('conflictsLink', [
      '/fleets',
      'investigate',
      'conflicts',
    ]);
    corrected = [];
    fixture.componentInstance.corrected.subscribe(value =>
      corrected.push(value),
    );
    fixture.detectChanges();
  }

  /** What the panel says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element in the panel.
   *
   * @param selector - Its selector.
   * @returns It, or null.
   */
  const find = <E extends Element = HTMLElement>(selector: string): E | null =>
    (fixture.nativeElement as HTMLElement).querySelector<E>(selector);

  /**
   * Finds a button by what it says.
   *
   * @param label - Its label.
   * @returns It.
   */
  const button = (label: string): HTMLButtonElement =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(
      candidate => textOf(candidate).trim() === label,
    ) as HTMLButtonElement;

  /**
   * Gives a reason.
   *
   * @param reason - What to type.
   */
  function giveReason(reason = '  Uploaded to the wrong Fleet  '): void {
    const field = find('#import-correction-reason') as HTMLTextAreaElement;

    field.value = reason;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /**
   * Picks a zone to read the export through.
   *
   * @param timezone - The IANA zone.
   */
  function pickZone(timezone: string): void {
    const select = find('#import-correction-zone') as HTMLSelectElement;

    select.value = timezone;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('needs a reason for every correction', () => {
    render();
    pickZone('America/New_York');

    expect(button('Take it out').disabled).toBe(true);
    expect(button('Mark it partial').disabled).toBe(true);
    expect(button('Read it again').disabled).toBe(true);

    giveReason('   ');

    expect(button('Take it out').disabled).toBe(true);

    giveReason();

    expect(button('Take it out').disabled).toBe(false);
    expect(button('Mark it partial').disabled).toBe(false);
    expect(button('Read it again').disabled).toBe(false);
  });

  it('corrects nothing that is neither in force nor held', () => {
    render(detail({ status: RosterImportStatus.REFUSED }));
    giveReason();

    expect(text()).toContain('Only an import in force, or held');
    expect(button('Take it out').disabled).toBe(true);
    expect(button('Mark it partial').disabled).toBe(true);
  });

  it('corrects a held import', () => {
    render(detail({ status: RosterImportStatus.HELD }));
    giveReason();

    expect(text()).not.toContain('Only an import in force, or held');
    expect(button('Take it out').disabled).toBe(false);
  });

  describe('taking it out of the history', () => {
    it('takes it out, with the reason, and passes the import up', () => {
      render();
      giveReason();
      button('Take it out').click();
      fixture.detectChanges();

      expect(imports.setExcluded).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        true,
        'Uploaded to the wrong Fleet',
      );
      expect(find('[role="status"]')?.textContent?.trim()).toBe(
        'Taken out of the history. The roster is rebuilt without it.',
      );
      expect(corrected).toEqual([detail({ excluded: true })]);
      expect(
        (find('#import-correction-reason') as HTMLTextAreaElement).value,
      ).toBe('');
    });

    it('puts an excluded import back', () => {
      imports.setExcluded.mockReturnValue(of(detail()));
      render(detail({ excluded: true }));

      expect(text()).toContain('This import is out of the history');

      giveReason('Right Fleet after all');
      button('Put it back').click();
      fixture.detectChanges();

      expect(imports.setExcluded).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        false,
        'Right Fleet after all',
      );
      expect(text()).toContain('Put back into the history.');
    });
  });

  describe('marking it partial', () => {
    it('marks it partial', () => {
      render();

      expect(text()).toContain('Taken as complete');

      giveReason('The export stopped early');
      button('Mark it partial').click();
      fixture.detectChanges();

      expect(imports.setPartial).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        true,
        'The export stopped early',
      );
      expect(text()).toContain('Marked partial: nobody missing from it');
    });

    it('marks a partial import complete', () => {
      render(detail({ partial: true }));

      expect(text()).toContain('Marked partial: nobody missing from it is');

      giveReason('It was complete');
      button('Mark it complete').click();
      fixture.detectChanges();

      expect(imports.setPartial).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        false,
        'It was complete',
      );
      expect(text()).toContain('Marked complete: anybody missing from it');
    });
  });

  describe('reading it through another zone', () => {
    it('starts on the zone it is read through, which changes nothing', () => {
      render();
      giveReason();

      expect((find('#import-correction-zone') as HTMLSelectElement).value).toBe(
        'Europe/London',
      );
      expect(button('Read it again').disabled).toBe(true);
    });

    it('reads it again through the zone picked', () => {
      render();
      giveReason('Taken in New York');
      pickZone('America/New_York');
      button('Read it again').click();
      fixture.detectChanges();

      expect(imports.correctTimezone).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        'America/New_York',
        null,
        'Taken in New York',
      );
      expect(text()).toContain('Read again through America/New_York.');
      // The zone goes back to the import's own, as passed in.
      expect((find('#import-correction-zone') as HTMLSelectElement).value).toBe(
        'Europe/London',
      );
    });

    it('asks which moment a stamp names twice, and sends the one picked', () => {
      render(detail({ exportLocalStamp: '2024-11-03T01:30:00' }));
      giveReason('Taken in New York');
      pickZone('America/New_York');

      const choices = Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLInputElement>('input[type="radio"]'),
      );

      expect(text()).toContain(
        'On that clock 2024-11-03T01:30:00 happened twice. Which?',
      );
      expect(choices.map(choice => choice.value)).toEqual([
        '2024-11-03T05:30:00.000Z',
        '2024-11-03T06:30:00.000Z',
      ]);
      expect(textOf(choices[1].parentElement as Element)).toContain(
        'which is 2024-11-03T06:30:00.000Z',
      );
      expect(button('Read it again').disabled).toBe(true);

      choices[1].click();
      fixture.detectChanges();
      button('Read it again').click();

      expect(imports.correctTimezone).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        'America/New_York',
        '2024-11-03T06:30:00.000Z',
        'Taken in New York',
      );
    });

    it('forgets the moment picked when another zone is', () => {
      render(detail({ exportLocalStamp: '2024-11-03T01:30:00' }));
      giveReason();
      pickZone('America/New_York');
      (find('input[type="radio"]') as HTMLInputElement).click();
      fixture.detectChanges();
      pickZone('America/Chicago');

      expect(fixture.componentInstance.pickedMoment()).toBeNull();
      expect(button('Read it again').disabled).toBe(true);
    });

    it('says when the stamp never happened on the clock picked', () => {
      render(
        detail({
          exportTimezone: 'America/New_York',
          exportLocalStamp: '2024-03-31T01:30:00',
        }),
      );
      giveReason();
      pickZone('Europe/London');

      expect(text()).toContain(
        'Its stamp, 2024-03-31T01:30:00, never happened on that clock',
      );
      expect(button('Read it again').disabled).toBe(true);
    });

    it('offers no zone while another export claims its moment', () => {
      render(detail({ conflictGroupId: 'group-1' }));

      expect(find('#import-correction-zone')).toBeNull();
      expect(text()).toContain('Another export claims this one’s moment.');
      expect(find('.import-corrections__group a')?.getAttribute('href')).toBe(
        '/fleets/investigate/conflicts',
      );
    });

    it('offers no zone for an import with no export time', () => {
      render(detail({ exportLocalStamp: null }));

      expect(find('#import-correction-zone')).toBeNull();
      expect(text()).toContain('It has no export time to read again.');
    });

    it('treats an import read through no zone as needing one', () => {
      render(detail({ exportTimezone: null }));
      giveReason();

      expect(text()).toContain('Read through no zone.');
      expect(fixture.componentInstance.moments()).toEqual([]);

      pickZone('Europe/London');

      expect(button('Read it again').disabled).toBe(false);
    });
  });

  it('holds every control while a correction is under way', () => {
    const answer$ = new Subject<RosterImportDetail>();

    imports.setPartial.mockReturnValue(answer$);
    render();
    giveReason();
    button('Mark it partial').click();
    fixture.detectChanges();

    expect(button('Saving').disabled).toBe(true);
    expect(button('Take it out').disabled).toBe(true);
    expect(
      (find('#import-correction-reason') as HTMLTextAreaElement).disabled,
    ).toBe(true);
    expect(
      (find('#import-correction-zone') as HTMLSelectElement).disabled,
    ).toBe(true);

    answer$.next(detail({ partial: true }));
    fixture.detectChanges();

    expect(button('Mark it partial')).toBeDefined();
  });

  it('shows the time-zone correction under way', () => {
    imports.correctTimezone.mockReturnValue(new Subject());
    render();
    giveReason();
    pickZone('America/New_York');
    button('Read it again').click();
    fixture.detectChanges();

    expect(button('Reading it again').disabled).toBe(true);
    expect(button('Saving')).toBeUndefined();
  });

  it.each([
    [409, 'This import is already excluded.'],
    [400, 'Through that timezone this export cannot be read.'],
  ])(
    'gives the server’s reason for a %i refusal, keeping the reason',
    (status, message) => {
      imports.setExcluded.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error: { message } })),
      );
      render();
      giveReason();
      button('Take it out').click();
      fixture.detectChanges();

      expect(text()).toContain(message);
      expect(corrected).toEqual([]);
      expect(find('[role="status"]')).toBeNull();
      expect(
        (find('#import-correction-reason') as HTMLTextAreaElement).value,
      ).toBe('  Uploaded to the wrong Fleet  ');
    },
  );

  it.each([
    ['a failure', new HttpErrorResponse({ status: 500 })],
    ['a refusal with no reason', new HttpErrorResponse({ status: 409 })],
  ])('says the correction was not made after %s', (_case, error) => {
    imports.setExcluded.mockReturnValue(throwError(() => error));
    render();
    giveReason();
    button('Take it out').click();
    fixture.detectChanges();

    expect(text()).toContain(ROSTER_IMPORT_CORRECTION_FAILED);
  });

  describe('corrections made', () => {
    it('lists each, newest first, with who, why and what it changed', () => {
      render(
        detail({
          actions: [
            {
              id: 'action-3',
              action: RosterImportActionKind.TIMEZONE_CORRECTED,
              actorName: 'steve',
              reason: 'Taken in New York',
              detail: {
                fromTimezone: 'Europe/London',
                toTimezone: 'America/New_York',
              },
              actedAt: '2024-12-03T12:00:00.000Z',
            },
            {
              id: 'action-2',
              action: RosterImportActionKind.ROWS_EXCLUDED,
              actorName: null,
              reason: 'Duplicates',
              detail: { lines: [2, 5] },
              actedAt: '2024-12-02T12:00:00.000Z',
            },
            {
              id: 'action-1',
              action: RosterImportActionKind.MARKED_PARTIAL,
              actorName: 'steve',
              reason: 'Stopped early',
              detail: null,
              actedAt: '2024-12-01T12:00:00.000Z',
            },
            {
              id: 'action-0',
              action: RosterImportActionKind.TIMEZONE_CORRECTED,
              actorName: 'steve',
              reason: 'First zone',
              detail: { fromTimezone: null, toTimezone: 'Europe/London' },
              actedAt: '2024-11-30T12:00:00.000Z',
            },
          ],
        }),
      );

      expect(
        Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll(
            '.import-corrections__actions li',
          ),
        ).map(item => textOf(item).trim()),
      ).toEqual([
        'Dec 3, 2024, 12:00:00 PM, steve corrected its timezone: “Taken in New York” From Europe/London to America/New_York.',
        'Dec 2, 2024, 12:00:00 PM, an account since closed excluded rows: “Duplicates” Line 2, 5.',
        'Dec 1, 2024, 12:00:00 PM, steve marked it partial: “Stopped early”',
        'Nov 30, 2024, 12:00:00 PM, steve corrected its timezone: “First zone” From no zone to Europe/London.',
      ]);
    });

    it('says when there are none', () => {
      render();

      expect(text()).toContain('Nobody has corrected this import.');
    });
  });
});
