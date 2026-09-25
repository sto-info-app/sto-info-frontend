import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  cellsOf,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportDetail,
  RosterImportRow,
  RosterImportRowPage,
} from 'src/app/models/fleet-import.models';

import {
  ROSTER_IMPORT_ROWS_ERROR,
  ROSTER_IMPORT_ROWS_FAILED,
  RosterImportRowsComponent,
} from './roster-import-rows.component';

/**
 * One row of the export.
 *
 * @param line - Its line.
 * @param overrides - Fields to change.
 * @returns The row.
 */
function row(
  line: number,
  overrides: Partial<RosterImportRow> = {},
): RosterImportRow {
  return {
    line,
    characterName: `Member ${line}`,
    accountHandle: `@fixture${line}`,
    guildRank: 'Captain',
    level: 65,
    contributionTotal: '4412077',
    joinedAt: '2022-01-09T18:20:00.000Z',
    lastActiveAt: null,
    excluded: false,
    ...overrides,
  };
}

/**
 * A page of rows.
 *
 * @param items - Its rows.
 * @param overrides - Fields to change.
 * @returns The page.
 */
function page(
  items: RosterImportRow[],
  overrides: Partial<RosterImportRowPage> = {},
): RosterImportRowPage {
  return { items, total: items.length, page: 1, pageSize: 50, ...overrides };
}

describe('RosterImportRowsComponent', () => {
  let fixture: ComponentFixture<RosterImportRowsComponent>;
  let imports: { rows: jest.Mock; setRowsExcluded: jest.Mock };
  let corrected: RosterImportDetail[];

  beforeEach(async () => {
    imports = {
      rows: jest.fn(() =>
        of(page([row(2), row(3), row(5, { excluded: true })])),
      ),
      setRowsExcluded: jest.fn(() =>
        of({ id: 'import-1' } as RosterImportDetail),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [RosterImportRowsComponent],
      providers: [
        { provide: RosterImportService, useValue: imports },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
      ],
    }).compileComponents();
  });

  /** Draws the list. */
  function render(): void {
    fixture = TestBed.createComponent(RosterImportRowsComponent);
    fixture.componentRef.setInput('communityId', 'community-1');
    fixture.componentRef.setInput('fleetId', 'fleet-1');
    fixture.componentRef.setInput('importId', 'import-1');
    corrected = [];
    fixture.componentInstance.corrected.subscribe(value =>
      corrected.push(value),
    );
    fixture.detectChanges();
  }

  /** What the list says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element in the list.
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

  /** Each row's tick box, in line order. */
  const ticks = (): HTMLInputElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
        'tbody input[type="checkbox"]',
      ),
    );

  /**
   * Ticks rows, by their place on the page.
   *
   * @param indexes - Their places, from 0.
   */
  function tick(...indexes: number[]): void {
    for (const index of indexes) {
      ticks()[index].click();
      fixture.detectChanges();
    }
  }

  /**
   * Gives a reason.
   *
   * @param reason - What to type.
   */
  function giveReason(reason = '  Duplicated by the game  '): void {
    const field = find('#import-rows-reason') as HTMLTextAreaElement;

    field.value = reason;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('reads the first page of the import’s rows, saying so meanwhile', () => {
    const rows$ = new Subject<RosterImportRowPage>();

    imports.rows.mockReturnValue(rows$);
    render();

    expect(imports.rows).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'import-1',
      1,
      50,
    );
    expect(text()).toContain('Reading the rows…');
    expect(fixture.componentInstance.tickedRows()).toEqual([]);

    rows$.next(page([row(2)]));
    fixture.detectChanges();

    expect(text()).not.toContain('Reading the rows…');
  });

  it('lists each row, saying which are excluded', () => {
    render();

    expect(
      cellsOf(find('table') as HTMLTableElement).map(cells => cells.slice(1)),
    ).toEqual([
      [
        '2',
        'Member 2@fixture2',
        'Captain',
        '65',
        '4,412,077',
        'Jan 9, 2022',
        '',
      ],
      [
        '3',
        'Member 3@fixture3',
        'Captain',
        '65',
        '4,412,077',
        'Jan 9, 2022',
        '',
      ],
      [
        '5',
        'Member 5@fixture5 excluded',
        'Captain',
        '65',
        '4,412,077',
        'Jan 9, 2022',
        '',
      ],
    ]);
    expect(
      find('tbody tr:last-child')?.classList.contains('import-rows__excluded'),
    ).toBe(true);
    expect(ticks()[0].getAttribute('aria-label')).toBe(
      'Line 2: Member 2@fixture2',
    );
  });

  it('says when none of the rows is in force', () => {
    imports.rows.mockReturnValue(of(page([])));
    render();

    expect(text()).toContain('None of this import’s rows is in force.');
    expect(find('table')).toBeNull();
  });

  it('says when the rows could not be read, and reads them again when asked', () => {
    imports.rows.mockReturnValueOnce(throwError(() => new Error('down')));
    render();

    expect(text()).toContain(ROSTER_IMPORT_ROWS_ERROR);

    button('Try again').click();
    fixture.detectChanges();

    expect(imports.rows).toHaveBeenCalledTimes(2);
    expect(find('table')).not.toBeNull();
  });

  describe('ticking', () => {
    it('excludes only rows that all count, with a reason', () => {
      render();
      tick(0);

      expect(text()).toContain('1 ticked.');
      expect(button('Exclude ticked').disabled).toBe(true);

      giveReason();

      expect(button('Exclude ticked').disabled).toBe(false);
      expect(button('Put back ticked').disabled).toBe(true);

      giveReason('   ');

      expect(button('Exclude ticked').disabled).toBe(true);
    });

    it('puts back only rows that are all excluded', () => {
      render();
      giveReason();
      tick(2);

      expect(button('Put back ticked').disabled).toBe(false);
      expect(button('Exclude ticked').disabled).toBe(true);

      tick(0);

      expect(button('Put back ticked').disabled).toBe(true);
      expect(button('Exclude ticked').disabled).toBe(true);
    });

    it('does nothing with no row ticked', () => {
      render();
      giveReason();

      expect(button('Exclude ticked').disabled).toBe(true);
      expect(button('Put back ticked').disabled).toBe(true);
    });

    it('clears a tick', () => {
      render();
      tick(0, 0);

      expect(fixture.componentInstance.tickedRows()).toEqual([]);
    });

    it('ticks every row on the page at once, and clears them', () => {
      render();

      const all = find<HTMLInputElement>(
        'thead input[type="checkbox"]',
      ) as HTMLInputElement;

      all.click();
      fixture.detectChanges();

      expect(ticks().every(box => box.checked)).toBe(true);
      expect(all.checked).toBe(true);

      all.click();
      fixture.detectChanges();

      expect(ticks().some(box => box.checked)).toBe(false);
      expect(fixture.componentInstance.allTicked(page([]))).toBe(false);
    });
  });

  it('excludes the rows ticked, in line order, and reads the page again', () => {
    render();
    tick(1, 0);
    giveReason();
    button('Exclude ticked').click();
    fixture.detectChanges();

    expect(imports.setRowsExcluded).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'import-1',
      [2, 3],
      true,
      'Duplicated by the game',
    );
    expect(find('[role="status"]')?.textContent?.trim()).toBe(
      '2 rows excluded: their members are unknown at this export.',
    );
    expect(imports.rows).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.tickedRows()).toEqual([]);
    expect((find('#import-rows-reason') as HTMLTextAreaElement).value).toBe('');
    expect(corrected).toEqual([{ id: 'import-1' }]);
  });

  it('says so for one row excluded', () => {
    render();
    tick(0);
    giveReason();
    button('Exclude ticked').click();
    fixture.detectChanges();

    expect(text()).toContain(
      '1 row excluded: its member is unknown at this export.',
    );
  });

  it('puts the rows ticked back', () => {
    render();
    tick(2);
    giveReason('Not a duplicate after all');
    button('Put back ticked').click();
    fixture.detectChanges();

    expect(imports.setRowsExcluded).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'import-1',
      [5],
      false,
      'Not a duplicate after all',
    );
    expect(text()).toContain('1 row put back into the history.');
  });

  it('holds the list while a change is under way', () => {
    imports.setRowsExcluded.mockReturnValue(new Subject());
    render();
    tick(0);
    giveReason();
    button('Exclude ticked').click();
    fixture.detectChanges();

    expect(ticks().every(box => box.disabled)).toBe(true);
    expect(button('Exclude ticked').disabled).toBe(true);
    expect((find('#import-rows-reason') as HTMLTextAreaElement).disabled).toBe(
      true,
    );
  });

  it.each([
    [409, 'The row on line 2 is already excluded.'],
    [400, 'This import has no row on line 9.'],
  ])(
    'gives the server’s reason for a %i refusal, keeping the ticks',
    (status, message) => {
      imports.setRowsExcluded.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error: { message } })),
      );
      render();
      tick(0);
      giveReason();
      button('Exclude ticked').click();
      fixture.detectChanges();

      expect(text()).toContain(message);
      expect(fixture.componentInstance.tickedRows().length).toBe(1);
      expect(corrected).toEqual([]);
    },
  );

  it.each([
    ['a failure', new HttpErrorResponse({ status: 500 })],
    ['a refusal with no reason', new HttpErrorResponse({ status: 409 })],
  ])('says the rows were not changed after %s', (_case, error) => {
    imports.setRowsExcluded.mockReturnValue(throwError(() => error));
    render();
    tick(0);
    giveReason();
    button('Exclude ticked').click();
    fixture.detectChanges();

    expect(text()).toContain(ROSTER_IMPORT_ROWS_FAILED);
  });

  describe('paging', () => {
    it('turns the page, clearing the ticks', () => {
      imports.rows.mockReturnValue(
        of(page([row(2), row(3)], { total: 120, page: 1 })),
      );
      render();
      tick(0);

      expect(text()).toContain('Page 1 of 3');
      expect(button('Earlier rows').disabled).toBe(true);

      imports.rows.mockReturnValue(
        of(page([row(52)], { total: 120, page: 2 })),
      );
      button('Later rows').click();
      fixture.detectChanges();

      expect(imports.rows).toHaveBeenLastCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        2,
        50,
      );
      expect(fixture.componentInstance.ticked().size).toBe(0);

      imports.rows.mockReturnValue(
        of(page([row(102)], { total: 120, page: 3 })),
      );
      button('Later rows').click();
      fixture.detectChanges();

      expect(button('Later rows').disabled).toBe(true);

      button('Earlier rows').click();
      fixture.detectChanges();

      expect(imports.rows).toHaveBeenLastCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
        2,
        50,
      );
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
