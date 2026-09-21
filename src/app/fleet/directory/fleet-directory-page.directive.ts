import { Directive, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';

import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import {
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
} from 'src/app/models/fleet.models';

import {
  FleetDirectoryResults,
  FleetDirectorySortOption,
  FleetDirectoryState,
} from './fleet-directory-page.models';

/** How many records a page of any Fleet listing holds. */
export const FLEET_DIRECTORY_PAGE_SIZE = 12;

/** Every lifecycle filter the server accepts. */
const STATUSES: readonly FleetDirectoryStatusFilter[] = [
  FleetDirectoryStatusFilter.ACTIVE,
  FleetDirectoryStatusFilter.CLOSED,
  FleetDirectoryStatusFilter.ANY,
];

/** Shown when a listing could not be read at all. */
export const FLEET_DIRECTORY_ERROR =
  'The directory could not be read. Please try again.';

/**
 * The half of a Fleet listing that is the same whichever scope it lists.
 *
 * Every question a reader asks lives in the query string, and the listing is
 * a function of it. That is what makes the back button, a bookmark and a
 * pasted link all work without a line of code for any of them, and it is why
 * a filter control navigates rather than calling the server: one path in,
 * one place where the current question is written down.
 *
 * Reloading through `switchMap` also cancels whatever was in flight, so the
 * answer to an abandoned question can never arrive after the answer to the
 * current one and overwrite it.
 *
 * What a subclass supplies is the request. Everything above — the loading
 * state, the failure, the paging arithmetic and reading the query string —
 * is identical across the three, and three copies of it would be three
 * chances for one listing to lose a filter when the page is turned.
 */
@Directive()
export abstract class FleetDirectoryPageDirective {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _router = inject(Router);
  protected readonly _datePipe = inject(AppDatePipe);

  /** What to say when nothing matches. */
  abstract readonly emptyMessage: string;

  /** The orderings this listing offers, which is not the same for all three. */
  abstract readonly sortOptions: readonly FleetDirectorySortOption[];

  /**
   * The listing, reloaded whenever the question in the URL changes.
   */
  readonly state$: Observable<FleetDirectoryState> =
    this._route.queryParamMap.pipe(
      switchMap(params =>
        this.load(params).pipe(
          map((results): FleetDirectoryState => ({ kind: 'READY', results })),
          catchError(() =>
            of<FleetDirectoryState>({
              kind: 'ERROR',
              message: FLEET_DIRECTORY_ERROR,
            }),
          ),
          // Emitted per question rather than once for the page, so turning to
          // page four says so instead of leaving page three on screen looking
          // like the answer.
          startWith<FleetDirectoryState>({ kind: 'LOADING' }),
        ),
      ),
    );

  /**
   * Asks the server the question the URL is currently holding.
   *
   * @param params - The query string.
   * @returns One page of results, already turned into cards.
   */
  protected abstract load(params: ParamMap): Observable<FleetDirectoryResults>;

  /** The search the URL is currently holding, for the search box. */
  get search(): string {
    return this._route.snapshot.queryParamMap.get('search') ?? '';
  }

  /** The lifecycle filter the URL is currently holding. */
  get status(): FleetDirectoryStatusFilter {
    return this.statusOf(this._route.snapshot.queryParamMap);
  }

  /** The ordering the URL is currently holding. */
  get sort(): FleetDirectorySort {
    return this.sortOf(this._route.snapshot.queryParamMap);
  }

  /**
   * Whether the URL narrows the listing in any way at all.
   *
   * Read off the query string rather than compared against defaults one
   * parameter at a time, because a default here is expressed by a parameter's
   * absence: what is written down is what the reader asked for. That also
   * means a listing which grows a fourth filter needs nothing changed here.
   *
   * The page is not a narrowing. Somebody on page three has not filtered
   * anything, and offering them a Clear button would be offering to undo
   * something they did not do.
   *
   * @returns True when there is anything to clear.
   */
  get anyFilterApplied(): boolean {
    const params = this._route.snapshot.queryParamMap;

    return params.keys.some(key => key !== 'page' && params.get(key) !== '');
  }

  /**
   * Reads one of the filters a particular listing has of its own.
   *
   * Generic because the three listings ask four different questions between
   * them and a getter apiece would be the same line written seven times.
   *
   * @param key - The query-string parameter.
   * @returns What the URL holds for it, or an empty string for nothing.
   */
  filterValue(key: string): string {
    return this._route.snapshot.queryParamMap.get(key) ?? '';
  }

  /**
   * Reads the name being searched for.
   *
   * @param params - The query string.
   * @returns The search, or undefined when there is none to send.
   */
  protected searchOf(params: ParamMap): string | undefined {
    return params.get('search') || undefined;
  }

  /**
   * Reads the lifecycle filter, refusing anything the server would.
   *
   * A value nobody offered is somebody's typing, and sending it on would
   * turn the listing into an error page over a query string the reader can
   * see is wrong. The default answers the question they most likely meant.
   *
   * @param params - The query string.
   * @returns The filter to apply.
   */
  protected statusOf(params: ParamMap): FleetDirectoryStatusFilter {
    const value = params.get('status');

    return STATUSES.includes(value as FleetDirectoryStatusFilter)
      ? (value as FleetDirectoryStatusFilter)
      : FleetDirectoryStatusFilter.ACTIVE;
  }

  /**
   * Reads the ordering, refusing anything this listing does not offer.
   *
   * Freshness on an Armada listing is the case that matters: the server
   * answers `400`, and a reader who pasted a Fleet listing's query string
   * onto an Armada one should get Armadas rather than a failure.
   *
   * @param params - The query string.
   * @returns The ordering to apply.
   */
  protected sortOf(params: ParamMap): FleetDirectorySort {
    const value = params.get('sort') as FleetDirectorySort | null;

    return value !== null && this.sortOptions.some(o => o.value === value)
      ? value
      : FleetDirectorySort.NAME;
  }

  /**
   * Searches for a name.
   *
   * @param search - What the reader typed.
   */
  onSearch(search: string): void {
    this.navigate({ search: search === '' ? null : search });
  }

  /**
   * Narrows to one set of lifecycle states.
   *
   * @param status - The filter the reader picked.
   */
  onStatus(status: FleetDirectoryStatusFilter): void {
    this.navigate({ status });
  }

  /**
   * Reorders the listing.
   *
   * @param sort - The ordering the reader picked.
   */
  onSort(sort: FleetDirectorySort): void {
    this.navigate({ sort });
  }

  /**
   * Narrows by one of the filters this listing has of its own.
   *
   * An empty value drops the parameter rather than sending it empty, because
   * `?platformId=` is a search for a platform whose id is the empty string
   * and the server would rightly refuse it.
   *
   * @param key - The query-string parameter.
   * @param value - What the control now holds.
   */
  onFilter(key: string, value: string): void {
    this.navigate({ [key]: value === '' ? null : value });
  }

  /**
   * Puts the listing back to the question it starts on.
   *
   * Replaces the query string rather than merging into it, so a filter added
   * later is dropped without this having to be told about it.
   */
  onClearAll(): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {},
    });
  }

  /**
   * Turns to a page.
   *
   * @param page - The page to show, counting from one.
   */
  onPage(page: number): void {
    this.navigate({ page }, true);
  }

  /**
   * Reads the paging parameters, which are the same for all three.
   *
   * @param params - The query string.
   * @returns The page to ask for, and how big it is.
   */
  protected paging(params: ParamMap): { page: number; pageSize: number } {
    const page = Number(params.get('page'));

    return {
      // A page number that is not a number at all, or is below the first
      // page, is somebody's typing rather than a request: it reads as page
      // one rather than as an error, because there is nothing wrong with the
      // listing itself.
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: FLEET_DIRECTORY_PAGE_SIZE,
    };
  }

  /**
   * Writes an instant out in the reader's own timezone.
   *
   * @param value - The instant, as the server sent it.
   * @returns The date as the reader would write it.
   */
  protected formatInstant = (value: string): string =>
    this._datePipe.transform(value) ?? value;

  /**
   * Rewrites the query string, keeping everything it does not mention.
   *
   * @param changes - The parameters to set, or null to drop.
   * @param keepPage - Whether the current page survives the change. It does
   *   not for a filter: a reader on page four who narrows the list would
   *   otherwise land on page four of a list that now has one.
   */
  private navigate(changes: Params, keepPage = false): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: keepPage ? changes : { ...changes, page: null },
      queryParamsHandling: 'merge',
    });
  }
}
