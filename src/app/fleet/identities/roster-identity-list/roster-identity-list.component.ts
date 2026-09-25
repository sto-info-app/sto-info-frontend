import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  FleetTabsComponent,
  FleetTabsVm,
  fleetTabsVmOf,
} from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  RosterIdentityDecisionDialogComponent,
  RosterIdentityDecisionDialogData,
  RosterIdentityDecisionDialogResult,
} from 'src/app/fleet/identities/roster-identity-decision-dialog/roster-identity-decision-dialog.component';
import {
  ROSTER_IDENTITY_ACTION_LABELS,
  ROSTER_IDENTITY_COLLISION_LABELS,
  ROSTER_IDENTITY_CONFIDENCE_LABELS,
  ROSTER_IDENTITY_KIND_LABELS,
  ROSTER_IDENTITY_SIGNAL_LABELS,
  ROSTER_IDENTITY_STATE_LABELS,
} from 'src/app/fleet/identities/roster-identity.messages';
import { RosterIdentityService } from 'src/app/fleet/identities/roster-identity.service';
import { ROSTER_INVESTIGATE_CAPABILITY } from 'src/app/fleet/imports/roster-import.constants';
import {
  RosterIdentityCandidate,
  RosterIdentityCandidatePage,
  RosterIdentityCandidateState,
  RosterIdentityDecisionAction,
  RosterIdentitySignalResult,
} from 'src/app/models/fleet-identity.models';
import { ResolvedStoFleet, StoFleet } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when the candidates could not be read for any reason but absence. */
export const ROSTER_IDENTITY_LIST_ERROR =
  'This Fleet’s rename candidates could not be read. Please try again.';

/** What to say when nothing answers to the address. */
export const ROSTER_IDENTITY_LIST_MISSING =
  'No Fleet here answers to that address. It may have been closed, or the ' +
  'address may have changed.';

/** What to say to somebody who may not review a Fleet's renames. */
export const ROSTER_IDENTITY_LIST_NOT_PERMITTED =
  'Reviewing this Fleet’s renames is not something your account may do.';

/** What to say when a decision failed for any reason the server did not give. */
export const ROSTER_IDENTITY_DECISION_ERROR =
  'That decision could not be recorded. Please try again.';

/** What to say once a decision is recorded. */
export const ROSTER_IDENTITY_DECISION_RECORDED =
  'Recorded. The Fleet’s roster identities are being worked out again, which ' +
  'takes a moment.';

/** Who decided something, once their account is gone. */
export const ROSTER_IDENTITY_ACTOR_GONE = 'an account since deleted';

/** The filters, as they stand in the address. */
export type RosterIdentityFilter = 'open' | 'confirmed' | 'rejected' | 'all';

/** The filters, in the order they are offered. */
export const ROSTER_IDENTITY_FILTERS: readonly {
  readonly value: RosterIdentityFilter;
  readonly label: string;
}[] = [
  { value: 'open', label: 'Open' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

/** The state each filter asks the server for. Null is every state. */
const FILTER_STATES: Record<
  RosterIdentityFilter,
  RosterIdentityCandidateState | null
> = {
  open: RosterIdentityCandidateState.OPEN,
  confirmed: RosterIdentityCandidateState.CONFIRMED,
  rejected: RosterIdentityCandidateState.REJECTED,
  all: null,
};

/** What to say when a filter finds nothing. */
const EMPTY_MESSAGES: Record<RosterIdentityFilter, string> = {
  open: 'No rename is waiting for a decision.',
  confirmed: 'No rename has been confirmed.',
  rejected: 'No rename has been rejected.',
  all: 'The rosters imported so far suggest no renames.',
};

/** What each decision's dialog says will happen. */
const DECISION_DIALOGS: Record<
  RosterIdentityDecisionAction,
  RosterIdentityDecisionDialogData
> = {
  [RosterIdentityDecisionAction.CONFIRM]: {
    title: 'Confirm this rename',
    message:
      '<p>Confirming says these names are one person, and the Fleet’s roster ' +
      'identities are worked out again to join them.</p>' +
      '<p>No STO Info account, and no account handle, is changed. It can be ' +
      'undone.</p>',
    confirmText: 'Confirm',
    reasonRequired: false,
  },
  [RosterIdentityDecisionAction.REJECT]: {
    title: 'Reject this rename',
    message:
      '<p>Rejecting says these are different people. The pairing stays ' +
      'rejected however many rosters suggest it again, until it is undone.</p>',
    confirmText: 'Reject',
    reasonRequired: false,
  },
  [RosterIdentityDecisionAction.UNDO]: {
    title: 'Undo this decision',
    message:
      '<p>Undoing opens this rename again, and separates anything confirming ' +
      'it joined.</p>' +
      '<p>Somebody decided it for a reason, so say why it was wrong.</p>',
    confirmText: 'Undo',
    reasonRequired: true,
  },
};

/** The page, once the Fleet and its candidates are read. */
export interface RosterIdentityListReady {
  readonly kind: 'READY';
  /** The Fleet's section tabs, or null for a Fleet with none. */
  readonly tabs: FleetTabsVm | null;
  readonly fleet: StoFleet;
  readonly communityId: string;
  readonly fleetLink: string[];
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly filter: RosterIdentityFilter;
  readonly page: RosterIdentityCandidatePage;
}

/** What the page is showing. */
export type RosterIdentityListState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR' }
  | {
      readonly kind: 'NOT_PERMITTED';
      /** The Fleet's section tabs, or null for a Fleet with none. */
      readonly tabs: FleetTabsVm | null;
      readonly fleet: StoFleet;
      readonly fleetLink: string[];
    }
  | RosterIdentityListReady;

/**
 * A Fleet's rename candidates, for its roster investigators to decide.
 *
 * Opens on the open ones, which are the ones waiting on somebody; a filter
 * reaches the decided ones, for their history and to undo them. The filter
 * and the page are in the address, so both survive a reload and the back
 * button.
 *
 * Each candidate shows the names it would join, the two exports it rests on,
 * every check that corroborates it or does not, and every decision taken on
 * it. One the evidence fits more than one way is shown with why, and offers
 * nothing to press: the server would refuse it.
 */
@Component({
  selector: 'app-roster-identity-list',
  templateUrl: './roster-identity-list.component.html',
  styleUrls: ['./roster-identity-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FleetTabsComponent,
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LoadingBarComponent,
  ],
})
export class RosterIdentityListComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _dialog = inject(MatDialog);
  private readonly _scopeService = inject(FleetScopeService);
  private readonly _identityService = inject(RosterIdentityService);

  /** Asks for the same page again, after a decision. */
  private readonly _reload$ = new BehaviorSubject<void>(undefined);

  readonly missingMessage = ROSTER_IDENTITY_LIST_MISSING;
  readonly errorMessage = ROSTER_IDENTITY_LIST_ERROR;
  readonly notPermittedMessage = ROSTER_IDENTITY_LIST_NOT_PERMITTED;
  readonly actorGone = ROSTER_IDENTITY_ACTOR_GONE;
  readonly filters = ROSTER_IDENTITY_FILTERS;
  readonly actions = RosterIdentityDecisionAction;
  readonly stateLabels = ROSTER_IDENTITY_STATE_LABELS;
  readonly kindLabels = ROSTER_IDENTITY_KIND_LABELS;
  readonly confidenceLabels = ROSTER_IDENTITY_CONFIDENCE_LABELS;
  readonly signalLabels = ROSTER_IDENTITY_SIGNAL_LABELS;
  readonly collisionLabels = ROSTER_IDENTITY_COLLISION_LABELS;
  readonly actionLabels = ROSTER_IDENTITY_ACTION_LABELS;

  /** Whether a decision is on its way. */
  readonly busy = signal(false);

  /** Why the last decision was refused, or null. */
  readonly decisionError = signal<string | null>(null);

  /** Said once a decision is recorded, or null. */
  readonly decisionNotice = signal<string | null>(null);

  /** The Fleet and a page of its candidates. */
  readonly state$: Observable<RosterIdentityListState> = combineLatest([
    this._route.paramMap,
    this._route.queryParamMap,
    this._reload$,
  ]).pipe(
    switchMap(([params, query]) =>
      this.load(params, filterOf(query), pageOf(query)).pipe(
        startWith<RosterIdentityListState>({ kind: 'LOADING' }),
      ),
    ),
    catchError((error: HttpErrorResponse) =>
      of<RosterIdentityListState>(
        error.status === HttpStatusCode.NotFound
          ? { kind: 'MISSING' }
          : { kind: 'ERROR' },
      ),
    ),
  );

  /**
   * What to say when a filter finds nothing.
   *
   * @param value - The filter.
   * @returns The sentence.
   */
  emptyMessage(value: RosterIdentityFilter): string {
    return EMPTY_MESSAGES[value];
  }

  /**
   * How a corroborating check came out, in a word or two.
   *
   * @param result - The check.
   * @returns What to show beside it.
   */
  signalOutcome(result: RosterIdentitySignalResult): string {
    if (result.held === null) {
      return 'Could not be checked';
    }

    return result.held ? 'Yes' : 'No';
  }

  /**
   * How many pages the listing runs to.
   *
   * @param page - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(page: RosterIdentityCandidatePage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Links to the import an export was read from.
   *
   * @param state - The page, with the Fleet it resolved.
   * @param importId - The import.
   * @returns The router link.
   */
  importLink(state: RosterIdentityListReady, importId: string): string[] {
    return FLEET_LINKS.fleetRosterImport(
      state.communitySlug,
      state.platformSegment,
      state.fleet.slug,
      importId,
    );
  }

  /**
   * Shows another filter, from its first page.
   *
   * Open is the address without a filter, so there is one address for it
   * rather than two.
   *
   * @param value - The filter.
   */
  onFilter(value: RosterIdentityFilter): void {
    this.clearDecisionMessages();
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { state: value === 'open' ? null : value, page: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Turns to another page, keeping it in the address.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    this.clearDecisionMessages();
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Asks the reviewer to go ahead with a decision, then records it.
   *
   * The revision sent is the one the candidate was read at, so a decision
   * somebody else took in the meantime is refused rather than overwritten.
   * Refused or recorded, the page is read again: either way what it showed
   * is no longer how things stand.
   *
   * @param state - The page, with the Fleet it resolved.
   * @param candidate - The candidate.
   * @param action - What to do.
   */
  decide(
    state: RosterIdentityListReady,
    candidate: RosterIdentityCandidate,
    action: RosterIdentityDecisionAction,
  ): void {
    this._dialog
      .open<
        RosterIdentityDecisionDialogComponent,
        RosterIdentityDecisionDialogData,
        RosterIdentityDecisionDialogResult
      >(RosterIdentityDecisionDialogComponent, {
        width: '75%',
        data: DECISION_DIALOGS[action],
      })
      .afterClosed()
      .pipe(
        filter(
          (result): result is RosterIdentityDecisionDialogResult =>
            result !== undefined,
        ),
        switchMap(result => {
          this.busy.set(true);
          this.clearDecisionMessages();

          return this._identityService.decide(
            state.communityId,
            state.fleet.id,
            candidate.id,
            { action, revision: candidate.revision, ...result },
          );
        }),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.decisionNotice.set(ROSTER_IDENTITY_DECISION_RECORDED);
          this._reload$.next();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.decisionError.set(refusalOf(error));
          this._reload$.next();
        },
      });
  }

  /** Forgets what the last decision came to. */
  private clearDecisionMessages(): void {
    this.decisionError.set(null);
    this.decisionNotice.set(null);
  }

  /**
   * Resolves the Fleet the address names, then reads a page of its candidates.
   *
   * @param params - The address, in segments.
   * @param value - The filter asked for.
   * @param page - The page asked for.
   * @returns The page's state.
   */
  private load(
    params: ParamMap,
    value: RosterIdentityFilter,
    page: number,
  ): Observable<RosterIdentityListState> {
    return this._scopeService
      .resolveFleet(
        params.get('communitySlug') ?? '',
        params.get('platformSegment') ?? '',
        params.get('slug') ?? '',
      )
      .pipe(switchMap(resolved => this.present(resolved, value, page)));
  }

  /**
   * Decides what the page shows about a resolved Fleet.
   *
   * @param resolved - The Fleet, as the server resolved it.
   * @param value - The filter asked for.
   * @param page - The page asked for.
   * @returns The page's state.
   */
  private present(
    resolved: ResolvedStoFleet,
    value: RosterIdentityFilter,
    page: number,
  ): Observable<RosterIdentityListState> {
    const { fleet, viewer } = resolved;
    const fleetLink = FLEET_LINKS.fleet(
      resolved.communitySlug,
      resolved.platformSegment,
      fleet.slug,
    );
    const communityId = fleet.communityId;

    // A Fleet no Community holds has no imports, and so nothing to rename.
    if (communityId === null) {
      return of<RosterIdentityListState>({ kind: 'MISSING' });
    }

    if (!viewer.capabilities.includes(ROSTER_INVESTIGATE_CAPABILITY)) {
      return of<RosterIdentityListState>({
        kind: 'NOT_PERMITTED',
        tabs: fleetTabsVmOf(resolved),
        fleet,
        fleetLink,
      });
    }

    return this._identityService
      .list(communityId, fleet.id, page, FILTER_STATES[value])
      .pipe(
        map((candidates): RosterIdentityListState => ({
          kind: 'READY',
          tabs: fleetTabsVmOf(resolved),
          fleet,
          communityId,
          fleetLink,
          communitySlug: resolved.communitySlug,
          platformSegment: resolved.platformSegment,
          filter: value,
          page: candidates,
        })),
      );
  }
}

/**
 * Reads the filter asked for out of the address.
 *
 * Anything that is not one of the filters is the open ones, rather than a
 * request the server would refuse.
 *
 * @param query - The address's query.
 * @returns The filter.
 */
function filterOf(query: ParamMap): RosterIdentityFilter {
  const value = query.get('state');

  return ROSTER_IDENTITY_FILTERS.some(option => option.value === value)
    ? (value as RosterIdentityFilter)
    : 'open';
}

/**
 * Reads the page asked for out of the address.
 *
 * @param query - The address's query.
 * @returns The page, from 1.
 */
function pageOf(query: ParamMap): number {
  const page = Number(query.get('page'));

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Says why a decision was refused.
 *
 * A conflict's message is the server's own sentence — it changed since it was
 * read, it cannot be decided, or it is not in a state the action applies to —
 * and is written for the reviewer. Anything else is not.
 *
 * @param error - What came back.
 * @returns The sentence to show.
 */
function refusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return error.status === HttpStatusCode.Conflict && typeof message === 'string'
    ? message
    : ROSTER_IDENTITY_DECISION_ERROR;
}
