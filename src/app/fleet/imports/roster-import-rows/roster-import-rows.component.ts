import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { ROSTER_IMPORT_REASON_LIMIT } from 'src/app/fleet/imports/roster-import-corrections/roster-import-corrections.component';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportDetail,
  RosterImportRow,
  RosterImportRowDirection,
  RosterImportRowPage,
  RosterImportRowsQuery,
  RosterImportRowSort,
} from 'src/app/models/fleet-import.models';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** How many rows a page holds: the most the server gives. */
export const ROSTER_IMPORT_ROWS_PAGE_SIZE = 50;

/** What to say when the rows could not be read. */
export const ROSTER_IMPORT_ROWS_ERROR =
  'This import’s rows could not be read. Please try again.';

/** What to say when rows could not be changed for a reason not given. */
export const ROSTER_IMPORT_ROWS_FAILED =
  'Those rows could not be changed. Please try again.';

/** A column of the rows table a reader can sort by, in the order drawn. */
export interface RosterImportRowColumn {
  readonly sort: RosterImportRowSort;
  readonly label: string;
  /** The way a first press sorts: the end a reader looks for first. */
  readonly firstDirection: RosterImportRowDirection;
  /** Whether the column holds a number, and so is drawn right-aligned. */
  readonly numeric: boolean;
}

/** The rows table's columns, in the order they are drawn (FC-055). */
export const ROSTER_IMPORT_ROW_COLUMNS: readonly RosterImportRowColumn[] = [
  {
    sort: RosterImportRowSort.LINE,
    label: 'Line',
    firstDirection: RosterImportRowDirection.ASC,
    numeric: true,
  },
  {
    sort: RosterImportRowSort.NAME,
    label: 'Character',
    firstDirection: RosterImportRowDirection.ASC,
    numeric: false,
  },
  {
    sort: RosterImportRowSort.RANK,
    label: 'Rank',
    firstDirection: RosterImportRowDirection.ASC,
    numeric: false,
  },
  {
    sort: RosterImportRowSort.LEVEL,
    label: 'Level',
    firstDirection: RosterImportRowDirection.DESC,
    numeric: true,
  },
  {
    sort: RosterImportRowSort.CONTRIBUTION,
    label: 'Contribution',
    firstDirection: RosterImportRowDirection.DESC,
    numeric: true,
  },
  {
    sort: RosterImportRowSort.JOINED,
    label: 'Joined',
    firstDirection: RosterImportRowDirection.ASC,
    numeric: false,
  },
  {
    sort: RosterImportRowSort.LAST_ACTIVE,
    label: 'Last Active',
    firstDirection: RosterImportRowDirection.DESC,
    numeric: false,
  },
];

/** What the list is showing. */
export type RosterImportRowsState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly rows: RosterImportRowPage };

/**
 * An import's rows, for an investigator to exclude or put back (FC-019,
 * FC-020).
 *
 * An excluded row leaves its member unknown at that export rather than
 * gone. Rows are ticked on the page shown, and a page turned clears the
 * ticks, so a request only ever names rows the investigator could see. The
 * server refuses a request naming any row already as asked, so excluding is
 * offered only when every row ticked counts, and putting back only when
 * every one is excluded.
 *
 * The rows can be found by part of a Character name or handle, narrowed to
 * a rank, and ordered by any column heading, across the whole import
 * (FC-055). A change of order or filter goes back to the first page and
 * clears the ticks, as turning the page does. The order and filters live
 * here while the panel is open, not in the address.
 */
@Component({
  selector: 'app-roster-import-rows',
  templateUrl: './roster-import-rows.component.html',
  styleUrls: ['./roster-import-rows.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    CollapsibleSectionComponent,
  ],
})
export class RosterImportRowsComponent {
  private readonly _importService = inject(RosterImportService);
  private readonly _destroyRef = inject(DestroyRef);

  /** Asks for the page shown again. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly errorMessage = ROSTER_IMPORT_ROWS_ERROR;
  readonly reasonLimit = ROSTER_IMPORT_REASON_LIMIT;
  readonly columns = ROSTER_IMPORT_ROW_COLUMNS;

  /** The Community holding the Fleet. */
  readonly communityId = input.required<string>();
  readonly fleetId = input.required<string>();
  readonly importId = input.required<string>();
  /**
   * Whether only to show the rows, with no ticking and nothing to change, as
   * a site admin looking in sees them (FC-036).
   */
  readonly readOnly = input(false);

  /** Tells the page the import changed, with the import as it now is. */
  readonly corrected = output<RosterImportDetail>();

  /** The page shown, from 1. */
  readonly page = signal(1);

  /** The column the rows are ordered by, and which way (FC-055). */
  readonly sort = signal<RosterImportRowSort>(RosterImportRowSort.LINE);
  readonly direction = signal<RosterImportRowDirection>(
    RosterImportRowDirection.ASC,
  );

  /** Part of a Character name or handle the rows are narrowed to, or empty. */
  readonly search = signal('');

  /** The rank label the rows are narrowed to, or empty for every rank. */
  readonly rank = signal('');

  /** What is asked of the server: the page, in the order, within the filters. */
  readonly query = computed((): RosterImportRowsQuery => ({
    page: this.page(),
    pageSize: ROSTER_IMPORT_ROWS_PAGE_SIZE,
    sort: this.sort(),
    direction: this.direction(),
    ...(this.search() ? { search: this.search() } : {}),
    ...(this.rank() ? { rank: this.rank() } : {}),
  }));

  /** Whether the rows are narrowed by a search or a rank. */
  readonly filtered = computed(
    () => this.search() !== '' || this.rank() !== '',
  );

  /** The lines ticked on it. */
  readonly ticked = signal<ReadonlySet<number>>(new Set());

  /** Why, for the rows ticked. */
  readonly reason = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /** What the last change came to, if it was recorded. */
  readonly notice = signal<string | null>(null);

  /** The page of rows, read again whenever what is asked changes or is asked for. */
  readonly state = toSignal(
    combineLatest([toObservable(this.query), this._reload$]).pipe(
      switchMap(([query]) =>
        this._importService
          .rows(this.communityId(), this.fleetId(), this.importId(), query)
          .pipe(
            map((rows): RosterImportRowsState => ({ kind: 'READY', rows })),
            catchError(() => of<RosterImportRowsState>({ kind: 'ERROR' })),
            startWith<RosterImportRowsState>({ kind: 'LOADING' }),
          ),
      ),
    ),
    { initialValue: { kind: 'LOADING' } as RosterImportRowsState },
  );

  /** The rows ticked, as the page shows them. */
  readonly tickedRows = computed((): RosterImportRow[] => {
    const state = this.state();
    const ticked = this.ticked();

    return state.kind === 'READY'
      ? state.rows.items.filter(row => ticked.has(row.line))
      : [];
  });

  /** Whether the rows ticked may be changed now: a reason, and no change under way. */
  private readonly _ready = computed(
    () =>
      !this.busy() &&
      this.tickedRows().length > 0 &&
      this.reason().trim() !== '',
  );

  /** Whether the rows ticked may be excluded: every one still counts. */
  readonly canExclude = computed(
    () => this._ready() && this.tickedRows().every(row => !row.excluded),
  );

  /** Whether the rows ticked may be put back: every one is excluded. */
  readonly canReinstate = computed(
    () => this._ready() && this.tickedRows().every(row => row.excluded),
  );

  /**
   * How a column is sorted now, for a screen reader.
   *
   * @param sort - The column.
   * @returns Its `aria-sort`.
   */
  ariaSort(sort: RosterImportRowSort): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== sort) {
      return 'none';
    }

    return this.direction() === RosterImportRowDirection.DESC
      ? 'descending'
      : 'ascending';
  }

  /**
   * What the table's caption says of the order.
   *
   * @returns The caption.
   */
  caption(): string {
    if (
      this.sort() === RosterImportRowSort.LINE &&
      this.direction() === RosterImportRowDirection.ASC
    ) {
      return 'The export’s rows, in the order it listed them';
    }

    const way =
      this.direction() === RosterImportRowDirection.DESC
        ? 'descending'
        : 'ascending';

    return `The export’s rows, by ${this.columnOf(this.sort()).label.toLowerCase()}, ${way}`;
  }

  /**
   * Orders the rows by a column: the column's first way on a first press,
   * the other way on a second. Back to the first page, with the ticks
   * cleared.
   *
   * @param sort - The column.
   */
  onSort(sort: RosterImportRowSort): void {
    let direction = this.columnOf(sort).firstDirection;

    if (this.sort() === sort) {
      direction =
        this.direction() === RosterImportRowDirection.DESC
          ? RosterImportRowDirection.ASC
          : RosterImportRowDirection.DESC;
    }

    this.ticked.set(new Set());
    this.page.set(1);
    this.sort.set(sort);
    this.direction.set(direction);
  }

  /**
   * The column that orders the rows by a sort. Every sort is a drawn column's,
   * and only a drawn column's heading sorts.
   *
   * @param sort - The sort.
   * @returns Its column.
   */
  private columnOf(sort: RosterImportRowSort): RosterImportRowColumn {
    return this.columns.find(
      entry => entry.sort === sort,
    ) as RosterImportRowColumn;
  }

  /**
   * Finds rows by part of a name or handle, and narrows them to a rank, from
   * the first page with the ticks cleared.
   *
   * @param search - Part of a Character name or handle, or empty.
   * @param rank - A rank label, or empty for every rank.
   */
  onFilter(search: string, rank: string): void {
    this.ticked.set(new Set());
    this.page.set(1);
    this.search.set(search.trim());
    this.rank.set(rank);
  }

  /**
   * Whether every row on a page is ticked.
   *
   * @param rows - The page.
   * @returns True when there are rows, and all are.
   */
  allTicked(rows: RosterImportRowPage): boolean {
    const ticked = this.ticked();

    return (
      rows.items.length > 0 && rows.items.every(row => ticked.has(row.line))
    );
  }

  /**
   * How many pages the rows run to.
   *
   * @param rows - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(rows: RosterImportRowPage): number {
    return rows.pageSize > 0 ? Math.ceil(rows.total / rows.pageSize) : 0;
  }

  /**
   * Writes a whole number with its thousands separated.
   *
   * @param value - The number, as a decimal string.
   * @returns It, written out.
   */
  whole(value: string): string {
    return BigInt(value).toLocaleString('en-GB');
  }

  /**
   * Ticks a row, or clears it.
   *
   * @param line - The row's line.
   * @param checked - Whether it is ticked now.
   */
  onTick(line: number, checked: boolean): void {
    this.ticked.update(ticked => {
      const next = new Set(ticked);

      if (checked) {
        next.add(line);
      } else {
        next.delete(line);
      }

      return next;
    });
  }

  /**
   * Ticks every row on the page shown, or clears them all.
   *
   * @param rows - The page.
   * @param checked - Whether they are ticked now.
   */
  onTickAll(rows: RosterImportRowPage, checked: boolean): void {
    this.ticked.set(new Set(checked ? rows.items.map(row => row.line) : []));
  }

  /**
   * Turns to another page, clearing the ticks.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    this.ticked.set(new Set());
    this.page.set(page);
  }

  /** Reads the page shown again. */
  onRetry(): void {
    this._reload$.next();
  }

  /**
   * Excludes the rows ticked, or puts them back.
   *
   * @param excluded - True to exclude them.
   */
  onChange(excluded: boolean): void {
    const lines = this.tickedRows()
      .map(row => row.line)
      .sort((a, b) => a - b);

    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this._importService
      .setRowsExcluded(
        this.communityId(),
        this.fleetId(),
        this.importId(),
        lines,
        excluded,
        this.reason().trim(),
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: detail => {
          const rows = lines.length === 1 ? '1 row' : `${lines.length} rows`;
          const whose =
            lines.length === 1 ? 'its member is' : 'their members are';

          this.busy.set(false);
          this.ticked.set(new Set());
          this.reason.set('');
          this.notice.set(
            excluded
              ? `${rows} excluded: ${whose} unknown at this export.`
              : `${rows} put back into the history.`,
          );
          this._reload$.next();
          this.corrected.emit(detail);
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(refusalOf(error));
        },
      });
  }
}

/**
 * Says why a change to rows was refused.
 *
 * @param error - The refusal.
 * @returns The server's own sentence for a change it understood and would
 *   not make — a row already as asked, say — and a general one otherwise.
 */
function refusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return (error.status === HttpStatusCode.Conflict ||
    error.status === HttpStatusCode.BadRequest) &&
    typeof message === 'string'
    ? message
    : ROSTER_IMPORT_ROWS_FAILED;
}
