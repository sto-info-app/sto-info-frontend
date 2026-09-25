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
  RosterImportRowPage,
} from 'src/app/models/fleet-import.models';
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
 * ticks, so a request only ever names rows the investigator could see
 * (Steve's decision of 25 September 2026). The server refuses a request
 * naming any row already as asked, so excluding is offered only when every
 * row ticked counts, and putting back only when every one is excluded.
 */
@Component({
  selector: 'app-roster-import-rows',
  templateUrl: './roster-import-rows.component.html',
  styleUrls: ['./roster-import-rows.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, LcarsErrorMessageComponent],
})
export class RosterImportRowsComponent {
  private readonly _importService = inject(RosterImportService);
  private readonly _destroyRef = inject(DestroyRef);

  /** Asks for the page shown again. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly errorMessage = ROSTER_IMPORT_ROWS_ERROR;
  readonly reasonLimit = ROSTER_IMPORT_REASON_LIMIT;

  /** The Community holding the Fleet. */
  readonly communityId = input.required<string>();
  readonly fleetId = input.required<string>();
  readonly importId = input.required<string>();

  /** Tells the page the import changed, with the import as it now is. */
  readonly corrected = output<RosterImportDetail>();

  /** The page shown, from 1. */
  readonly page = signal(1);

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

  /** The page of rows, read again whenever it changes or is asked for. */
  readonly state = toSignal(
    combineLatest([toObservable(this.page), this._reload$]).pipe(
      switchMap(([page]) =>
        this._importService
          .rows(
            this.communityId(),
            this.fleetId(),
            this.importId(),
            page,
            ROSTER_IMPORT_ROWS_PAGE_SIZE,
          )
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

          this.busy.set(false);
          this.ticked.set(new Set());
          this.reason.set('');
          this.notice.set(
            excluded
              ? `${rows} excluded: ${lines.length === 1 ? 'its member is' : 'their members are'} unknown at this export.`
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
