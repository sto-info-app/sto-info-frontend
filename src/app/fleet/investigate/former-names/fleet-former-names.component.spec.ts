import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { Observable, of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  cellsOf,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  EXACT_GAME_NAME_MAX_CODEPOINTS,
  EXACT_GAME_NAME_TOO_LONG,
  inputCeilingFor,
} from 'src/app/fleet/fleet-name-length';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterIdentityDecisionDialogComponent } from 'src/app/fleet/identities/roster-identity-decision-dialog/roster-identity-decision-dialog.component';
import { ROSTER_READ_ONLY_NOTE } from 'src/app/fleet/imports/roster-import.constants';
import { FLEET_SECTION_MISSING } from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetFormerName,
  FleetFormerNameList,
} from 'src/app/models/fleet-former-name.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import { FleetFormerNameService } from './fleet-former-name.service';
import {
  FLEET_FORMER_NAME_ACTOR_GONE,
  FLEET_FORMER_NAME_GONE,
  FLEET_FORMER_NAME_REASON_LIMIT,
  FLEET_FORMER_NAME_RECORD_FAILED,
  FLEET_FORMER_NAME_RECORDED,
  FLEET_FORMER_NAME_REMOVE_FAILED,
  FLEET_FORMER_NAME_REMOVED,
  FLEET_FORMER_NAMES_NOT_PERMITTED,
  FleetFormerNamesComponent,
  FleetFormerNamesData,
} from './fleet-former-names.component';

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param capabilities - What the reader holds.
 * @returns The resolved Fleet.
 */
function resolved(
  capabilities: string[] = ['roster.investigate'],
): ResolvedStoFleet {
  return {
    fleet: {
      id: 'fleet-1',
      slug: 'ninth-fleet',
      exactGameName: 'Ninth Fleet',
      communityId: 'community-1',
      platformProvidesRosterExport: true,
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: { capabilities, roles: [] },
  } as unknown as ResolvedStoFleet;
}

/**
 * A former name.
 *
 * @param overrides - Fields to change.
 * @returns The name: used through the first five months of 2024, in London,
 *   recorded and never removed.
 */
function formerName(overrides: Partial<FleetFormerName> = {}): FleetFormerName {
  return {
    id: 'alias-1',
    exactName: ' Eighth Fleet ',
    validFrom: '2024-01-01T00:00:00.000Z',
    // Midnight at the start of 1 June, in summer time.
    validTo: '2024-05-31T23:00:00.000Z',
    reason: 'Renamed at the start of June',
    recordedByName: 'steve',
    recordedAt: '2024-06-02T10:00:00.000Z',
    removedAt: null,
    removedByName: null,
    removalReason: null,
    matchedImports: 2,
    ...overrides,
  };
}

/**
 * The Fleet's former names.
 *
 * @param overrides - Fields to change.
 * @returns The list: one name in use, none removed, and the reader may
 *   change them.
 */
function list(
  overrides: Partial<FleetFormerNameList> = {},
): FleetFormerNameList {
  return {
    items: [formerName()],
    removed: [],
    mayChange: true,
    ...overrides,
  };
}

describe('FleetFormerNamesComponent', () => {
  let fixture: ComponentFixture<FleetFormerNamesComponent>;
  let scopes: { resolveFleet: jest.Mock };
  let formerNames: { list: jest.Mock; record: jest.Mock; remove: jest.Mock };
  let dialog: { open: jest.Mock };

  beforeEach(async () => {
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    formerNames = {
      list: jest.fn(() => of(list())),
      record: jest.fn(() => of(formerName({ id: 'alias-2' }))),
      remove: jest.fn(() => of(formerName())),
    };
    dialog = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [FleetFormerNamesComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: FleetFormerNameService, useValue: formerNames },
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
        { provide: MatDialog, useValue: dialog },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(
              convertToParamMap({
                communitySlug: 'united-federation-alliance',
                platformSegment: 'pc',
                slug: 'ninth-fleet',
              }),
            ),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(FleetFormerNamesComponent);
    fixture.detectChanges();
  }

  /** What the page says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element on the page.
   *
   * @param selector - Its selector.
   * @returns It, or null.
   */
  const find = <E extends Element = HTMLElement>(selector: string): E | null =>
    (fixture.nativeElement as HTMLElement).querySelector<E>(selector);

  /**
   * Every table's cells, table by table.
   *
   * @returns Each table's rows.
   */
  const tables = (): string[][][] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('table'),
    ).map(table => cellsOf(table));

  /**
   * Finds a button by what it says.
   *
   * @param label - The button's text.
   * @returns Every button saying it.
   */
  const buttons = (label: string): HTMLButtonElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).filter(button => button.textContent?.trim() === label);

  /**
   * Types into a field, as somebody would.
   *
   * @param id - The field's id.
   * @param value - What is typed.
   */
  function type(id: string, value: string): void {
    const field = find<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);

    (field as HTMLInputElement).value = value;
    (field as HTMLInputElement).dispatchEvent(new Event('input'));
    (field as HTMLInputElement).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  /**
   * Fills the form in.
   *
   * @param from - The first day the name was used.
   * @param until - The last.
   * @param reason - Why it is recorded.
   */
  function fill(
    from = '2023-01-01',
    until = '2023-05-31',
    reason = ' Old ',
  ): void {
    type('former-name-name', ' Seventh Fleet ');
    type('former-name-from', from);
    type('former-name-until', until);
    type('former-name-reason', reason);
  }

  /** Sends the form, as the button would. */
  function submit(): void {
    buttons('Record this name')[0].click();
    fixture.detectChanges();
  }

  /**
   * Has the removal dialog close with an answer.
   *
   * @param answer - What it closes with.
   */
  function answerRemoval(answer: { reason?: string } | undefined): void {
    dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
  }

  describe('reading', () => {
    it('reads the names of the Fleet the address names', () => {
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'ninth-fleet',
      );
      expect(formerNames.list).toHaveBeenCalledWith('community-1', 'fleet-1');
      expect(text()).toContain('Former names');
      expect(text()).toContain('Nothing is ever learned from a file');
      expect(find('app-fleet-tabs')).not.toBeNull();
    });

    it('lists each name exactly, when it was used, why, who recorded it and what it matched', () => {
      render();

      expect(tables()).toEqual([
        [
          [
            '“Eighth Fleet”',
            'From Jan 1, 2024 until May 31, 2024',
            'Renamed at the start of June',
            'Recorded by steve on Jun 2, 2024',
            'Matched 2 imports',
            'Remove',
          ],
        ],
      ]);
      // The edge spaces are drawn, one mark each.
      expect(find('.fleet-exact-name')?.getAttribute('aria-label')).toBe(
        'Eighth Fleet, with one leading space and one trailing space',
      );
    });

    it.each([
      [0, null, 'Matched no imports yet'],
      [0, '2024-07-01T00:00:00.000Z', 'Matched no imports'],
      [1, null, 'Matched 1 import'],
      [5, '2024-07-01T00:00:00.000Z', 'Matched 5 imports'],
    ])(
      'says %p matched imports as it should, removed at %p',
      (matchedImports, removedAt, label) => {
        render();

        expect(
          fixture.componentInstance.matchedLabel(
            formerName({ matchedImports, removedAt }),
          ),
        ).toBe(label);
      },
    );

    it('says whose account is gone, and a name with no end as used onwards', () => {
      formerNames.list.mockReturnValue(
        of(
          list({
            items: [formerName({ recordedByName: null, validTo: null })],
          }),
        ),
      );
      render();

      expect(text()).toContain(`Recorded by ${FLEET_FORMER_NAME_ACTOR_GONE}`);
      expect(text()).toContain('From Jan 1, 2024 onwards');
    });

    it('says when no name is recorded, and lists no removed ones', () => {
      formerNames.list.mockReturnValue(of(list({ items: [] })));
      render();

      expect(text()).toContain('No former names are recorded for this Fleet.');
      expect(find('table')).toBeNull();
      expect(text()).not.toContain('Removed names');
    });

    it('lists the removed names beneath, with who removed them and why', () => {
      formerNames.list.mockReturnValue(
        of(
          list({
            items: [],
            removed: [
              formerName({
                removedAt: '2024-07-01T09:00:00.000Z',
                removedByName: 'kirk',
                removalReason: 'Recorded in error',
                matchedImports: 0,
              }),
              formerName({
                id: 'alias-3',
                removedAt: '2024-06-15T09:00:00.000Z',
                removedByName: null,
                removalReason: 'Wrong dates',
              }),
            ],
          }),
        ),
      );
      render();

      expect(text()).toContain('Removed names');
      expect(tables()).toEqual([
        [
          [
            '“Eighth Fleet”',
            'From Jan 1, 2024 until May 31, 2024',
            'Removed by kirk on Jul 1, 2024: Recorded in error',
            'Matched no imports',
          ],
          [
            '“Eighth Fleet”',
            'From Jan 1, 2024 until May 31, 2024',
            `Removed by ${FLEET_FORMER_NAME_ACTOR_GONE} on Jun 15, 2024: Wrong dates`,
            'Matched 2 imports',
          ],
        ],
      ]);
    });

    it('offers a site admin looking in nothing to change, and says so', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved(['roster.investigate.read'])),
      );
      formerNames.list.mockReturnValue(of(list({ mayChange: false })));
      render();

      expect(text()).toContain(ROSTER_READ_ONLY_NOTE);
      expect(find('form')).toBeNull();
      expect(buttons('Remove')).toEqual([]);
      expect(tables()[0][0]).toHaveLength(5);
    });

    it('says nothing of reading only to an investigator', () => {
      render();

      expect(text()).not.toContain(ROSTER_READ_ONLY_NOTE);
      expect(find('form')).not.toBeNull();
    });

    it('tells a reader who may not investigate so, without asking for the names', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved(['roster.import'])));
      render();

      expect(text()).toContain(FLEET_FORMER_NAMES_NOT_PERMITTED);
      expect(formerNames.list).not.toHaveBeenCalled();
    });

    it('says the section is missing when the server does not answer for it', () => {
      formerNames.list.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );
      render();

      expect(text()).toContain(FLEET_SECTION_MISSING);
    });
  });

  describe('recording', () => {
    it('records the name untrimmed, from the start of the first day to the start of the day after the last', () => {
      render();
      fill();
      submit();

      expect(formerNames.record).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        {
          exactName: ' Seventh Fleet ',
          validFrom: '2023-01-01T00:00:00.000Z',
          // 1 June 2023 began at 23:00 UTC, in summer time.
          validTo: '2023-05-31T23:00:00.000Z',
          reason: 'Old',
        },
      );
      expect(text()).toContain(FLEET_FORMER_NAME_RECORDED);
      expect(formerNames.list).toHaveBeenCalledTimes(2);
      expect(find<HTMLInputElement>('#former-name-name')?.value).toBe('');
      expect(find<HTMLInputElement>('#former-name-from')?.value).toBe('');
    });

    it('records a name used for a single day', () => {
      render();
      fill('2023-02-10', '2023-02-10');
      submit();

      expect(formerNames.record).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        expect.objectContaining({
          validFrom: '2023-02-10T00:00:00.000Z',
          validTo: '2023-02-11T00:00:00.000Z',
        }),
      );
    });

    it('asks for everything it needs before sending anything', () => {
      render();
      submit();

      expect(formerNames.record).not.toHaveBeenCalled();
      expect(text()).toContain('Please give the name the Fleet had.');
      expect(text()).toContain('Please say when the name was first used.');
      expect(text()).toContain('Please say the last day the name was used.');
      expect(text()).toContain('Say why, so whoever looks at this next knows.');
    });

    // The server counts codepoints, so "𝕬" is one character, not two; the
    // same budget as the register forms, spaces at either end included.
    it('accepts a name at the budget in codepoints, however many units it takes', () => {
      const name = ' ' + '𝕬'.repeat(EXACT_GAME_NAME_MAX_CODEPOINTS - 2) + ' ';

      render();
      fill();
      type('former-name-name', name);
      submit();

      expect(formerNames.record).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        expect.objectContaining({ exactName: name }),
      );
      expect(text()).not.toContain(EXACT_GAME_NAME_TOO_LONG);
    });

    it('refuses a name over the budget, counting its edge spaces', () => {
      render();
      fill();
      type(
        'former-name-name',
        ' ' + '𝕬'.repeat(EXACT_GAME_NAME_MAX_CODEPOINTS - 1) + ' ',
      );
      submit();

      expect(formerNames.record).not.toHaveBeenCalled();
      expect(text()).toContain(
        'A name can be at most 64 characters, counting any spaces at either end.',
      );
      expect(text()).not.toContain('Please give the name the Fleet had.');
    });

    // The attribute counts UTF-16 units, so it is a ceiling that never clips
    // a name the validator would accept.
    it('lets the box hold a whole astral name', () => {
      render();

      expect(find<HTMLInputElement>('#former-name-name')?.maxLength).toBe(
        inputCeilingFor(EXACT_GAME_NAME_MAX_CODEPOINTS),
      );
    });

    it('refuses a reason of nothing but spaces', () => {
      render();
      fill('2023-01-01', '2023-05-31', '   ');
      submit();

      expect(formerNames.record).not.toHaveBeenCalled();
      expect(text()).toContain('Say why, so whoever looks at this next knows.');
    });

    it('refuses a reason longer than the server keeps', () => {
      render();
      fill(
        '2023-01-01',
        '2023-05-31',
        'x'.repeat(FLEET_FORMER_NAME_REASON_LIMIT + 1),
      );
      submit();

      expect(formerNames.record).not.toHaveBeenCalled();
      expect(text()).toContain(
        `Keep it to ${FLEET_FORMER_NAME_REASON_LIMIT} characters.`,
      );
    });

    it('refuses a last day before the first', () => {
      render();
      fill('2023-05-31', '2023-01-01');
      submit();

      expect(formerNames.record).not.toHaveBeenCalled();
      expect(text()).toContain(
        'The last day it was used cannot be before the first.',
      );
    });

    it('sends nothing more while a name is on its way', () => {
      formerNames.record.mockReturnValue(new Subject());
      render();
      fill();
      submit();

      expect(buttons('Recording')[0].disabled).toBe(true);
      fixture.componentInstance.onRecord({} as FleetFormerNamesData);

      expect(formerNames.record).toHaveBeenCalledTimes(1);
    });

    it.each([
      [400, 'The name has to stop being used after it began.'],
      [400, 'A former name has to have stopped being used by now.'],
      [409, 'That is the Fleet’s name now.'],
      [409, 'That name is already recorded for part of that time.'],
    ])(
      'shows the server’s own refusal (%p: %p), keeping what was typed',
      (status, message) => {
        formerNames.record.mockReturnValue(
          throwError(
            () => new HttpErrorResponse({ status, error: { message } }),
          ),
        );
        render();
        fill();
        submit();

        expect(text()).toContain('Not recorded');
        expect(text()).toContain(message);
        expect(text()).not.toContain(FLEET_FORMER_NAME_RECORDED);
        expect(find<HTMLInputElement>('#former-name-name')?.value).toBe(
          ' Seventh Fleet ',
        );
        expect(formerNames.list).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      [500, { message: 'Internal detail' }],
      [400, null],
      [409, { message: ['not', 'a', 'sentence'] }],
    ])('says only that it failed for anything else (%p)', (status, error) => {
      formerNames.record.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error })),
      );
      render();
      fill();
      submit();

      expect(text()).toContain(FLEET_FORMER_NAME_RECORD_FAILED);
      expect(text()).not.toContain('Internal detail');
    });
  });

  describe('removing', () => {
    it('asks why in the removal dialog, removes the name and reads the names again', () => {
      answerRemoval({ reason: 'Recorded in error' });
      render();
      buttons('Remove')[0].click();
      fixture.detectChanges();

      expect(dialog.open).toHaveBeenCalledWith(
        RosterIdentityDecisionDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Remove this former name',
            confirmText: 'Remove',
            reasonRequired: true,
          }),
        }),
      );
      const asked = dialog.open.mock.calls[0][1].data.message as string;

      expect(asked).toContain('keep their match');
      expect(asked).toContain('matches nothing new');
      expect(formerNames.remove).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'alias-1',
        'Recorded in error',
      );
      expect(text()).toContain(FLEET_FORMER_NAME_REMOVED);
      expect(formerNames.list).toHaveBeenCalledTimes(2);
    });

    it('removes nothing when the dialog is cancelled', () => {
      answerRemoval(undefined);
      render();
      buttons('Remove')[0].click();
      fixture.detectChanges();

      expect(formerNames.remove).not.toHaveBeenCalled();
      expect(formerNames.list).toHaveBeenCalledTimes(1);
    });

    it.each([
      [404, FLEET_FORMER_NAME_GONE],
      [500, FLEET_FORMER_NAME_REMOVE_FAILED],
    ])(
      'says why a removal failed (%p), and reads the names again',
      (status, message) => {
        answerRemoval({ reason: 'Recorded in error' });
        formerNames.remove.mockReturnValue(
          throwError(() => new HttpErrorResponse({ status })),
        );
        render();
        buttons('Remove')[0].click();
        fixture.detectChanges();

        expect(text()).toContain('Not removed');
        expect(text()).toContain(message);
        expect(formerNames.list).toHaveBeenCalledTimes(2);
      },
    );

    it('forgets what the last change came to when another begins', () => {
      answerRemoval({ reason: 'Recorded in error' });
      render();
      buttons('Remove')[0].click();
      fixture.detectChanges();

      expect(text()).toContain(FLEET_FORMER_NAME_REMOVED);

      const pending = new Subject<FleetFormerName>();

      formerNames.record.mockReturnValue(
        pending as Observable<FleetFormerName>,
      );
      fill();
      submit();

      expect(text()).not.toContain(FLEET_FORMER_NAME_REMOVED);
    });
  });
});
