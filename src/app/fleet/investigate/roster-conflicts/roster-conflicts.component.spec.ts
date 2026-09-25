import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  cellsOf,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportConflictFilter,
  RosterImportConflictGroup,
  RosterImportConflictPage,
  RosterImportDetail,
  RosterImportStatus,
  RosterImportSummary,
} from 'src/app/models/fleet-import.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  ROSTER_CONFLICT_SELECT_FAILED,
  ROSTER_CONFLICTS_NOT_PERMITTED,
  RosterConflictsComponent,
} from './roster-conflicts.component';

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
    viewer: { capabilities },
  } as unknown as ResolvedStoFleet;
}

/**
 * One export of a conflict.
 *
 * @param id - Its import.
 * @param overrides - Fields to change.
 * @returns The export, as the listing reports it.
 */
function member(
  id: string,
  overrides: Partial<RosterImportSummary> = {},
): RosterImportSummary {
  return {
    id,
    originalFilename: `Ninth Fleet_20241101-120000 (${id}).csv`,
    rowCount: 40,
    status: RosterImportStatus.IMPORTED,
    uploadedByName: 'steve',
    uploadedAt: '2024-11-01T12:30:00.000Z',
    excluded: false,
    partial: false,
    ...overrides,
  } as RosterImportSummary;
}

/**
 * A conflict group.
 *
 * @param overrides - Fields to change.
 * @returns The group: two exports, the first standing, never settled.
 */
function group(
  overrides: Partial<RosterImportConflictGroup> = {},
): RosterImportConflictGroup {
  return {
    id: 'group-1',
    exportedAt: '2024-11-01T12:00:00.000Z',
    openedAt: '2024-11-01T12:31:00.000Z',
    resolvedAt: null,
    selectedImportId: null,
    members: [
      member('import-1'),
      member('import-2', {
        status: RosterImportStatus.HELD,
        uploadedByName: null,
        partial: true,
      }),
    ],
    ...overrides,
  };
}

/**
 * A page of groups.
 *
 * @param items - Its groups.
 * @param overrides - Fields to change.
 * @returns The page.
 */
function page(
  items: RosterImportConflictGroup[],
  overrides: Partial<RosterImportConflictPage> = {},
): RosterImportConflictPage {
  return { items, total: items.length, page: 1, pageSize: 20, ...overrides };
}

describe('RosterConflictsComponent', () => {
  let fixture: ComponentFixture<RosterConflictsComponent>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let imports: { conflicts: jest.Mock; select: jest.Mock };
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    imports = {
      conflicts: jest.fn(() => of(page([group()]))),
      select: jest.fn(() => of({ id: 'import-2' } as RosterImportDetail)),
    };

    await TestBed.configureTestingModule({
      imports: [RosterConflictsComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterImportService, useValue: imports },
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
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
            queryParamMap: query$,
          },
        },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(RosterConflictsComponent);
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
   * Each export's name and the notes beneath it, row by row. The notes sit
   * on lines of their own, so the cell's text runs them together.
   *
   * @returns The names and notes.
   */
  const exportsListed = (): string[][] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'tbody td:first-child',
      ),
    ).map(cell =>
      Array.from(cell.querySelectorAll('a, .fleet-report-note')).map(part =>
        textOf(part).trim(),
      ),
    );

  /** The Select buttons, in the order drawn. */
  const selects = (): HTMLButtonElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody button'),
    );

  /**
   * Gives a reason for the first group.
   *
   * @param reason - What to type.
   */
  function giveReason(reason = '  The complete one  '): void {
    const field = find('#reason-group-1') as HTMLTextAreaElement;

    field.value = reason;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('reads the groups waiting for a selection by default', () => {
    render();

    expect(imports.conflicts).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      RosterImportConflictFilter.OPEN,
      1,
    );
  });

  it.each([
    [{ state: 'settled', page: '3' }, RosterImportConflictFilter.SETTLED, 3],
    [{ state: 'ALL' }, RosterImportConflictFilter.ALL, 1],
    [{ state: 'nonsense', page: 'x' }, RosterImportConflictFilter.OPEN, 1],
    [{ page: '0' }, RosterImportConflictFilter.OPEN, 1],
  ])('reads what the address asks for: %j', (params, state, pageNumber) => {
    query$.next(convertToParamMap(params));
    render();

    expect(imports.conflicts).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      state,
      pageNumber,
    );
  });

  it('is only for investigators', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.import'])));
    render();

    expect(text()).toContain(ROSTER_CONFLICTS_NOT_PERMITTED);
    expect(imports.conflicts).not.toHaveBeenCalled();
  });

  it('offers each list, lighting the one shown, each from its first page', () => {
    query$.next(convertToParamMap({ state: 'settled', page: '2' }));
    render();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.roster-conflicts__filters a',
      ),
    );

    expect(
      links.map(link => [
        textOf(link).trim(),
        link.getAttribute('href')?.split('?')[1],
        link.getAttribute('aria-current'),
        link.classList.contains('gold'),
      ]),
    ).toEqual([
      ['Waiting', undefined, null, false],
      ['Settled', 'state=settled', 'page', true],
      ['All', 'state=all', null, false],
    ]);
  });

  it.each([
    [{}, 'No exports of this Fleet are waiting for a selection.'],
    [
      { state: 'settled' },
      'No conflict between this Fleet’s exports has been settled yet.',
    ],
    [
      { state: 'all' },
      'No two exports of this Fleet have claimed the same moment.',
    ],
  ])('says so when there are none: %j', (params, message) => {
    imports.conflicts.mockReturnValue(of(page([])));
    query$.next(convertToParamMap(params));
    render();

    expect(text()).toContain(message);
  });

  it('lists each group’s exports as they arrived', () => {
    render();

    expect(text()).toContain('Exports claiming Nov 1, 2024, 12:00:00 PM');
    expect(text()).toContain(
      'Found Nov 1, 2024, 12:31:00 PM. Waiting for a selection.',
    );
    expect(
      cellsOf(find('table') as HTMLTableElement).map(cells => cells.slice(1)),
    ).toEqual([
      [
        'Nov 1, 2024, 12:30:00 PM by steve',
        '40',
        'Imported',
        'Select this one',
      ],
      [
        'Nov 1, 2024, 12:30:00 PM by an account since closed',
        '40',
        'Held',
        'Select this one',
      ],
    ]);
    expect(exportsListed()).toEqual([
      ['Ninth Fleet_20241101-120000 (import-1).csv'],
      ['Ninth Fleet_20241101-120000 (import-2).csv', 'partial'],
    ]);
    expect(find('tbody a')?.getAttribute('href')).toMatch(
      /\/investigate\/imports\/import-1$/,
    );
  });

  it('marks the export selected, and offers no selecting it again', () => {
    imports.conflicts.mockReturnValue(
      of(
        page([
          group({
            selectedImportId: 'import-1',
            resolvedAt: '2024-11-02T09:00:00.000Z',
          }),
        ]),
      ),
    );
    render();

    expect(text()).toContain('Settled Nov 2, 2024, 9:00:00 AM.');
    expect(exportsListed()[0]).toEqual([
      'Ninth Fleet_20241101-120000 (import-1).csv',
      'Selected',
    ]);
    expect(selects().length).toBe(1);
  });

  it('says a reopened group keeps its selection until it is changed', () => {
    imports.conflicts.mockReturnValue(
      of(page([group({ selectedImportId: 'import-1' })])),
    );
    render();

    expect(text()).toContain(
      'Reopened by an export that disagrees with the selection',
    );
  });

  it('selects nothing without a reason, nor an excluded export', () => {
    imports.conflicts.mockReturnValue(
      of(
        page([
          group({
            members: [
              member('import-1'),
              member('import-3', { excluded: true }),
            ],
          }),
        ]),
      ),
    );
    render();

    expect(selects().map(button => button.disabled)).toEqual([true, true]);
    expect(text()).toContain('excluded by an investigator');

    giveReason('   ');

    expect(selects()[0].disabled).toBe(true);

    giveReason();

    expect(selects().map(button => button.disabled)).toEqual([false, true]);
  });

  it('selects an export with the reason, and reads the groups again', () => {
    render();
    giveReason();
    selects()[0].click();
    fixture.detectChanges();

    expect(imports.select).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'import-1',
      'The complete one',
    );
    expect(imports.conflicts).toHaveBeenCalledTimes(2);
    expect(textOf(find('[role="status"]') as HTMLElement).trim()).toBe(
      'Ninth Fleet_20241101-120000 (import-1).csv, uploaded Nov 1, 2024, 12:30:00 PM, now stands for its moment. The history is rebuilt to match.',
    );
    expect((find('#reason-group-1') as HTMLTextAreaElement).value).toBe('');
  });

  it('says a held export is read before the history is rebuilt', () => {
    render();
    giveReason();
    selects()[1].click();
    fixture.detectChanges();

    expect(textOf(find('[role="status"]') as HTMLElement).trim()).toBe(
      'Ninth Fleet_20241101-120000 (import-2).csv, uploaded Nov 1, 2024, 12:30:00 PM, now stands for its moment. It had not been read into the history, so it is read now, and the history is rebuilt after.',
    );
  });

  it('holds the group while a selection is under way', () => {
    const selected$ = new Subject<RosterImportDetail>();

    imports.select.mockReturnValue(selected$);
    render();
    giveReason();
    selects()[0].click();
    fixture.detectChanges();

    expect(selects().map(button => textOf(button).trim())).toEqual([
      'Selecting',
      'Selecting',
    ]);
    expect(selects().every(button => button.disabled)).toBe(true);
    expect((find('#reason-group-1') as HTMLTextAreaElement).disabled).toBe(
      true,
    );

    selected$.next({ id: 'import-1' } as RosterImportDetail);
    fixture.detectChanges();

    expect(selects()[0].disabled).toBe(true);
    expect(textOf(selects()[0]).trim()).toBe('Select this one');
  });

  it('gives the server’s reason for a selection it refused, and reads again', () => {
    imports.select.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'That export is already the one selected.' },
          }),
      ),
    );
    render();
    giveReason();
    selects()[0].click();
    fixture.detectChanges();

    expect(text()).toContain('That export is already the one selected.');
    expect(imports.conflicts).toHaveBeenCalledTimes(2);
    expect(find('[role="status"]')).toBeNull();
  });

  it.each([
    ['a failure', new HttpErrorResponse({ status: 500 })],
    ['a refusal with no reason', new HttpErrorResponse({ status: 409 })],
  ])('says the export was not selected after %s', (_case, error) => {
    imports.select.mockReturnValue(throwError(() => error));
    render();
    giveReason();
    selects()[0].click();
    fixture.detectChanges();

    expect(text()).toContain(ROSTER_CONFLICT_SELECT_FAILED);
  });

  describe('paging', () => {
    /**
     * Finds a pagination button.
     *
     * @param label - What it says.
     * @returns It.
     */
    const pager = (label: string): HTMLButtonElement =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.lcars-pagination button',
        ),
      ).find(button => textOf(button).trim() === label) as HTMLButtonElement;

    it('turns to later and earlier pages, keeping it in the address', () => {
      imports.conflicts.mockReturnValue(
        of(page([group()], { total: 45, page: 2, pageSize: 20 })),
      );
      render();

      expect(text()).toContain('Page 2 of 3');

      pager('Earlier').click();
      pager('Later').click();

      expect(navigate.mock.calls.map(call => call[1].queryParams)).toEqual([
        { page: 3 },
        { page: null },
      ]);
    });

    it('offers no paging when everything fits, or nothing is paged', () => {
      render();

      expect(find('.lcars-pagination')).toBeNull();
      expect(
        fixture.componentInstance.totalPages(page([], { pageSize: 0 })),
      ).toBe(0);
    });
  });
});
