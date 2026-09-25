import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Directive, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  FleetTabsVm,
  fleetTabsVmOf,
} from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

/** What to say when nothing answers to a section's address. */
export const FLEET_SECTION_MISSING =
  'No Fleet here answers to that address. It may have been closed, or the ' +
  'address may have changed.';

/** What to say when a section could not be read for any reason but absence. */
export const FLEET_SECTION_ERROR = 'This could not be read. Please try again.';

/** The Fleet a section page is about, once resolved. */
export interface FleetSection {
  readonly resolved: ResolvedStoFleet;
  /** Never null: a Fleet no Community holds has no sections. */
  readonly communityId: string;
  readonly fleetId: string;
  /** The Fleet's name, exactly as recorded. */
  readonly fleetName: string;
  readonly tabs: FleetTabsVm;
}

/** What a section page is showing. */
export type FleetSectionState<T> =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'NOT_PERMITTED'; readonly section: FleetSection }
  | {
      readonly kind: 'READY';
      readonly section: FleetSection;
      readonly data: T;
    };

/**
 * The half of a Fleet section page — its roster, history, reports and the
 * pages investigators work from — that is the same for all of them
 * (FC-020).
 *
 * The address names the Fleet by its Community, platform and slug, so every
 * page resolves it first, then asks whether the reader may open the section
 * before asking for the section itself. Absent, failed and not permitted are
 * three different things to tell a reader: a Fleet that does not answer, a
 * request that did not, and a section that is not theirs to read. A Fleet no
 * Community holds has no roster, so none of its sections answers either.
 *
 * Each navigation is resolved and caught on its own, so a failure on one
 * address does not leave the page unable to show the next.
 */
@Directive()
export abstract class FleetSectionPageDirective<T> {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _scopeService = inject(FleetScopeService);

  /** Asks for the section again, keeping the address. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly missingMessage = FLEET_SECTION_MISSING;
  readonly errorMessage = FLEET_SECTION_ERROR;

  /** What to tell a reader the section is not open to. */
  abstract readonly notPermittedMessage: string;

  /**
   * The capabilities, any one of which opens the section. Empty when anybody
   * who can see the Fleet may open it, and the server decides the rest.
   */
  protected abstract readonly _requiredCapabilities: readonly string[];

  /** The Fleet and the section, reloaded whenever the address changes. */
  readonly state$: Observable<FleetSectionState<T>> = combineLatest([
    this._route.paramMap,
    this._route.queryParamMap,
    this._reload$,
  ]).pipe(
    switchMap(([params, query]) =>
      this.open(params, query).pipe(
        catchError((error: HttpErrorResponse) =>
          of<FleetSectionState<T>>(
            error.status === HttpStatusCode.NotFound
              ? { kind: 'MISSING' }
              : { kind: 'ERROR' },
          ),
        ),
        startWith<FleetSectionState<T>>({ kind: 'LOADING' }),
      ),
    ),
  );

  /** Reads the section again, keeping the address. */
  reload(): void {
    this._reload$.next();
  }

  /**
   * The Fleet's name, for the line beneath the page's heading.
   *
   * @param state - What the page is showing.
   * @returns The name, or null before the Fleet is known.
   */
  subjectOf(state: FleetSectionState<T>): string | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.section.fleetName
      : null;
  }

  /**
   * What to show instead of the section, where anything.
   *
   * @param state - What the page is showing.
   * @returns The message, or null while loading or ready.
   */
  messageOf(state: FleetSectionState<T>): string | null {
    switch (state.kind) {
      case 'MISSING':
        return this.missingMessage;
      case 'ERROR':
        return this.errorMessage;
      case 'NOT_PERMITTED':
        return this.notPermittedMessage;
      default:
        return null;
    }
  }

  /**
   * The tab strip, once the Fleet is known.
   *
   * @param state - What the page is showing.
   * @returns The strip's view model, or null.
   */
  tabsOf(state: FleetSectionState<T>): FleetTabsVm | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.section.tabs
      : null;
  }

  /**
   * Reads the section, once the Fleet is resolved and the reader may.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns The section's data.
   */
  protected abstract load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<T>;

  /**
   * Resolves the Fleet the address names, then reads the section.
   *
   * @param params - The address, in segments.
   * @param query - The address's query.
   * @returns The page's state.
   */
  private open(
    params: ParamMap,
    query: ParamMap,
  ): Observable<FleetSectionState<T>> {
    return this._scopeService
      .resolveFleet(
        params.get('communitySlug') ?? '',
        params.get('platformSegment') ?? '',
        params.get('slug') ?? '',
      )
      .pipe(
        switchMap(resolved => {
          const tabs = fleetTabsVmOf(resolved);
          const communityId = resolved.fleet.communityId;

          if (tabs === null || communityId === null) {
            return of<FleetSectionState<T>>({ kind: 'MISSING' });
          }

          const section: FleetSection = {
            resolved,
            communityId,
            fleetId: resolved.fleet.id,
            fleetName: resolved.fleet.exactGameName,
            tabs,
          };
          const capabilities = resolved.viewer.capabilities;

          if (
            this._requiredCapabilities.length > 0 &&
            !this._requiredCapabilities.some(capability =>
              capabilities.includes(capability),
            )
          ) {
            return of<FleetSectionState<T>>({
              kind: 'NOT_PERMITTED',
              section,
            });
          }

          return this.load(section, query).pipe(
            map((data): FleetSectionState<T> => ({
              kind: 'READY',
              section,
              data,
            })),
          );
        }),
      );
  }
}
