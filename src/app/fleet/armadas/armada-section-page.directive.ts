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
  ArmadaTabsVm,
  armadaTabsVmOf,
} from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { ResolvedStoArmada } from 'src/app/models/fleet.models';

/** What to say when nothing answers to a section's address. */
export const ARMADA_SECTION_MISSING =
  'No Armada here answers to that address. There may be no such Armada, or ' +
  'it may not be shown to you.';

/** What to say when a section could not be read for any reason but absence. */
export const ARMADA_SECTION_ERROR = 'This could not be read. Please try again.';

/** The Armada a section page is about, once resolved. */
export interface ArmadaSection {
  readonly resolved: ResolvedStoArmada;
  readonly communityId: string;
  readonly armadaId: string;
  /** The Armada's name, exactly as recorded. */
  readonly armadaName: string;
  readonly tabs: ArmadaTabsVm;
}

/** What a section page is showing. */
export type ArmadaSectionState<T> =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'NOT_PERMITTED'; readonly section: ArmadaSection }
  | {
      readonly kind: 'READY';
      readonly section: ArmadaSection;
      readonly data: T;
    };

/**
 * The half of an Armada section page — its history and requests — that is
 * the same for both (FC-026), as the Fleet's sections share theirs.
 *
 * The address names the Armada by its Community, platform and slug, so every
 * page resolves it first, then asks whether the reader may open the section
 * before asking for the section itself. Absent, failed and not permitted are
 * three different things to tell a reader.
 */
@Directive()
export abstract class ArmadaSectionPageDirective<T> {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _scopeService = inject(FleetScopeService);

  /** Asks for the section again, keeping the address. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly missingMessage = ARMADA_SECTION_MISSING;
  readonly errorMessage = ARMADA_SECTION_ERROR;

  /** What to tell a reader the section is not open to. */
  abstract readonly notPermittedMessage: string;

  /**
   * The capabilities, any one of which opens the section. Empty when anybody
   * who can see the Armada may open it.
   */
  protected abstract readonly _requiredCapabilities: readonly string[];

  /** The Armada and the section, reloaded whenever the address changes. */
  readonly state$: Observable<ArmadaSectionState<T>> = combineLatest([
    this._route.paramMap,
    this._route.queryParamMap,
    this._reload$,
  ]).pipe(
    switchMap(([params, query]) =>
      this.open(params, query).pipe(
        catchError((error: HttpErrorResponse) =>
          of<ArmadaSectionState<T>>(
            error.status === HttpStatusCode.NotFound
              ? { kind: 'MISSING' }
              : { kind: 'ERROR' },
          ),
        ),
        startWith<ArmadaSectionState<T>>({ kind: 'LOADING' }),
      ),
    ),
  );

  /** Reads the section again, keeping the address. */
  reload(): void {
    this._reload$.next();
  }

  /**
   * The Armada's name, for the line beneath the page's heading.
   *
   * @param state - What the page is showing.
   * @returns The name, or null before the Armada is known.
   */
  subjectOf(state: ArmadaSectionState<T>): string | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.section.armadaName
      : null;
  }

  /**
   * What to show instead of the section, where anything.
   *
   * @param state - What the page is showing.
   * @returns The message, or null while loading or ready.
   */
  messageOf(state: ArmadaSectionState<T>): string | null {
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
   * The tab strip, once the Armada is known.
   *
   * @param state - What the page is showing.
   * @returns The strip's view model, or null.
   */
  tabsOf(state: ArmadaSectionState<T>): ArmadaTabsVm | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.section.tabs
      : null;
  }

  /**
   * Reads the section, once the Armada is resolved and the reader may.
   *
   * @param section - The Armada.
   * @param query - The address's query.
   * @returns The section's data.
   */
  protected abstract load(
    section: ArmadaSection,
    query: ParamMap,
  ): Observable<T>;

  /**
   * Resolves the Armada the address names, then reads the section.
   *
   * @param params - The address, in segments.
   * @param query - The address's query.
   * @returns The page's state.
   */
  private open(
    params: ParamMap,
    query: ParamMap,
  ): Observable<ArmadaSectionState<T>> {
    return this._scopeService
      .resolveArmada(
        params.get('communitySlug') ?? '',
        params.get('platformSegment') ?? '',
        params.get('slug') ?? '',
      )
      .pipe(
        switchMap(resolved => {
          const section: ArmadaSection = {
            resolved,
            communityId: resolved.armada.communityId,
            armadaId: resolved.armada.id,
            armadaName: resolved.armada.exactGameName,
            tabs: armadaTabsVmOf(resolved),
          };

          if (
            this._requiredCapabilities.length > 0 &&
            !this._requiredCapabilities.some(capability =>
              resolved.viewer.capabilities.includes(capability),
            )
          ) {
            return of<ArmadaSectionState<T>>({
              kind: 'NOT_PERMITTED',
              section,
            });
          }

          return this.load(section, query).pipe(
            map((data): ArmadaSectionState<T> => ({
              kind: 'READY',
              section,
              data,
            })),
          );
        }),
      );
  }
}
