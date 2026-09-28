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

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ArmadaTabsVm,
  armadaTabsVmOf,
} from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import {
  FleetTabsVm,
  fleetTabsVmOf,
} from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import { GOVERNANCE_READER_ROLES } from 'src/app/fleet/governance/governance.constants';
import {
  FleetScopeStatus,
  FleetScopeViewer,
} from 'src/app/models/fleet.models';

/** What to say when nothing answers to a Manage page's address. */
export const GOVERNANCE_MISSING =
  'Nothing here answers to that address. It may have been closed, or the ' +
  'address may have changed.';

/** What to say when a Manage page could not be read for any other reason. */
export const GOVERNANCE_ERROR = 'This could not be read. Please try again.';

/** The Community or Fleet a Manage page is about, once resolved. */
export interface GovernanceScopeVm {
  /** Where the server finds it. */
  readonly target: GovernanceTarget;
  /** Whether it is the Community rather than one of its Fleets. */
  readonly isCommunity: boolean;
  /** Its name, exactly as recorded. */
  readonly name: string;
  /** Whether it has been closed. */
  readonly isClosed: boolean;
  /** The role labels the reader holds there. */
  readonly roles: readonly string[];
  /** What the reader may do there. */
  readonly capabilities: readonly string[];
  /** Whether the reader administers the site. */
  readonly isSiteAdmin: boolean;
  /** The scope's own page. */
  readonly scopeLink: string[];
  /** The Manage hub; every Manage page hangs below it. */
  readonly manageLink: string[];
  /** A Fleet's tab strip, or null on a Community or Armada. */
  readonly tabs: FleetTabsVm | null;
  /** Whether it is an Armada (FC-025). */
  readonly isArmada: boolean;
  /** An Armada's tab strip, or null on a Community or Fleet. */
  readonly armadaTabs: ArmadaTabsVm | null;
}

/** What a Manage page is showing. */
export type GovernancePageState<T> =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'NOT_PERMITTED'; readonly scope: GovernanceScopeVm }
  | {
      readonly kind: 'READY';
      readonly scope: GovernanceScopeVm;
      readonly data: T;
    };

/**
 * The half of a Manage page that is the same for all of them (FC-022).
 *
 * A Community's Manage pages and a Fleet's are the same pages at two kinds of
 * address. The address says which: a Fleet's names its platform. Each page
 * resolves the scope, asks whether the reader may open it, and then reads
 * what it shows; absent, failed and not permitted are told apart, as the
 * Fleet's other sections tell them apart.
 */
@Directive()
export abstract class GovernancePageDirective<T> {
  protected readonly _route = inject(ActivatedRoute);
  protected readonly _scopeService = inject(FleetScopeService);
  protected readonly _authService = inject(AuthService);

  /** Asks for the page again, keeping the address. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly missingMessage = GOVERNANCE_MISSING;
  readonly errorMessage = GOVERNANCE_ERROR;

  /** What to tell a reader the page is not open to. */
  abstract readonly notPermittedMessage: string;

  /** The scope and the page, reloaded whenever the address changes. */
  readonly state$: Observable<GovernancePageState<T>> = combineLatest([
    this._route.paramMap,
    this._reload$,
  ]).pipe(
    switchMap(([params]) =>
      this.open(params).pipe(
        catchError((error: HttpErrorResponse) =>
          of<GovernancePageState<T>>(
            error.status === HttpStatusCode.NotFound
              ? { kind: 'MISSING' }
              : { kind: 'ERROR' },
          ),
        ),
        startWith<GovernancePageState<T>>({ kind: 'LOADING' }),
      ),
    ),
  );

  /** Reads the page again, keeping the address. */
  reload(): void {
    this._reload$.next();
  }

  /**
   * The scope's name, for the line beneath the heading.
   *
   * @param state - What the page is showing.
   * @returns The name, or null before the scope is known.
   */
  subjectOf(state: GovernancePageState<T>): string | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.scope.name
      : null;
  }

  /**
   * What to show instead of the page, where anything.
   *
   * @param state - What the page is showing.
   * @returns The message, or null while loading or ready.
   */
  messageOf(state: GovernancePageState<T>): string | null {
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
   * An Armada's tab strip, once the Armada is known (FC-025).
   *
   * @param state - What the page is showing.
   * @returns The strip's view model, or null anywhere else or before.
   */
  armadaTabsOf(state: GovernancePageState<T>): ArmadaTabsVm | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.scope.armadaTabs
      : null;
  }

  /**
   * A Fleet's tab strip, once the Fleet is known.
   *
   * @param state - What the page is showing.
   * @returns The strip's view model, or null on a Community or before.
   */
  tabsOf(state: GovernancePageState<T>): FleetTabsVm | null {
    return state.kind === 'READY' || state.kind === 'NOT_PERMITTED'
      ? state.scope.tabs
      : null;
  }

  /**
   * Whether the reader may open this page.
   *
   * The Owner and Admins, by default. A page may ask for less or more.
   *
   * @param scope - The scope.
   * @returns True when they may.
   */
  protected mayOpen(scope: GovernanceScopeVm): boolean {
    return scope.roles.some(role => GOVERNANCE_READER_ROLES.includes(role));
  }

  /**
   * Reads the page, once the scope is resolved and the reader may.
   *
   * @param scope - The scope.
   * @returns The page's data.
   */
  protected abstract load(scope: GovernanceScopeVm): Observable<T>;

  /**
   * Resolves the scope the address names, then reads the page.
   *
   * @param params - The address, in segments.
   * @returns The page's state.
   */
  private open(params: ParamMap): Observable<GovernancePageState<T>> {
    return this.resolveScope(params).pipe(
      switchMap(scope => {
        if (scope === null) {
          return of<GovernancePageState<T>>({ kind: 'MISSING' });
        }

        if (!this.mayOpen(scope)) {
          return of<GovernancePageState<T>>({ kind: 'NOT_PERMITTED', scope });
        }

        return this.load(scope).pipe(
          map((data): GovernancePageState<T> => ({
            kind: 'READY',
            scope,
            data,
          })),
        );
      }),
    );
  }

  /**
   * Resolves the Community, or the Fleet in it, that the address names.
   *
   * @param params - The address, in segments.
   * @returns The scope, or null for a Fleet no Community holds.
   */
  private resolveScope(params: ParamMap): Observable<GovernanceScopeVm | null> {
    const communitySlug = params.get('communitySlug') ?? '';
    const platformSegment = params.get('platformSegment');
    const isSiteAdmin = this._authService.isLoggedInAsAdmin();

    // An Armada's Manage pages are these pages, told so by their route.
    if (this._route.snapshot?.data?.['governs'] === 'ARMADA') {
      return this._scopeService
        .resolveArmada(
          communitySlug,
          platformSegment ?? '',
          params.get('slug') ?? '',
        )
        .pipe(
          map(resolved => {
            const { armada } = resolved;

            return {
              target: {
                communityId: armada.communityId,
                fleetId: null,
                armadaId: armada.id,
              },
              isCommunity: false,
              isArmada: true,
              name: armada.exactGameName,
              isClosed: armada.status === FleetScopeStatus.CLOSED,
              ...standing(resolved.viewer),
              isSiteAdmin,
              scopeLink: FLEET_LINKS.armada(
                resolved.communitySlug,
                resolved.platformSegment,
                armada.slug,
              ),
              manageLink: FLEET_LINKS.armadaManage(
                resolved.communitySlug,
                resolved.platformSegment,
                armada.slug,
              ),
              tabs: null,
              armadaTabs: armadaTabsVmOf(resolved),
            };
          }),
        );
    }

    if (platformSegment === null) {
      return this._scopeService.resolveCommunity(communitySlug).pipe(
        map(({ community, viewer }) => {
          const scopeLink = FLEET_LINKS.community(community.slug);

          return {
            target: { communityId: community.id, fleetId: null },
            isCommunity: true,
            name: community.name,
            isClosed: community.status === FleetScopeStatus.CLOSED,
            ...standing(viewer),
            isSiteAdmin,
            scopeLink,
            manageLink: FLEET_LINKS.communityManage(community.slug),
            tabs: null,
            isArmada: false,
            armadaTabs: null,
          };
        }),
      );
    }

    return this._scopeService
      .resolveFleet(communitySlug, platformSegment, params.get('slug') ?? '')
      .pipe(
        map(resolved => {
          const tabs = fleetTabsVmOf(resolved);
          const { fleet } = resolved;

          if (tabs === null || fleet.communityId === null) {
            return null;
          }

          const scopeLink = FLEET_LINKS.fleet(
            resolved.communitySlug,
            resolved.platformSegment,
            fleet.slug,
          );

          return {
            target: { communityId: fleet.communityId, fleetId: fleet.id },
            isCommunity: false,
            name: fleet.exactGameName,
            isClosed: fleet.status === FleetScopeStatus.CLOSED,
            ...standing(resolved.viewer),
            isSiteAdmin,
            scopeLink,
            manageLink: FLEET_LINKS.fleetManage(
              resolved.communitySlug,
              resolved.platformSegment,
              fleet.slug,
            ),
            tabs,
            isArmada: false,
            armadaTabs: null,
          };
        }),
      );
  }
}

/**
 * What the reader holds at a scope.
 *
 * @param viewer - The server's answer about them.
 * @returns Their role labels and capabilities.
 */
function standing(
  viewer: FleetScopeViewer,
): Pick<GovernanceScopeVm, 'roles' | 'capabilities'> {
  return { roles: viewer.roles, capabilities: viewer.capabilities };
}
