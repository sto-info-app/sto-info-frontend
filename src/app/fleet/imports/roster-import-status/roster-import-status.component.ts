import { AsyncPipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';

import {
  catchError,
  concat,
  defer,
  EMPTY,
  exhaustMap,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  takeWhile,
  tap,
  timer,
} from 'rxjs';

import {
  FleetTabsComponent,
  FleetTabsVm,
  fleetTabsVmOf,
} from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  ROSTER_IMPORT_POLL_INTERVAL_MS,
  ROSTER_IMPORT_POLL_WINDOW_MS,
  ROSTER_IMPORT_READERS,
} from 'src/app/fleet/imports/roster-import.constants';
import {
  describeStatusReason,
  ROSTER_IMPORT_STATUS_DESCRIPTIONS,
  ROSTER_IMPORT_STATUS_LABELS,
  ROSTER_ROW_REJECTIONS,
} from 'src/app/fleet/imports/roster-import.messages';
import { RosterImportCorrectionsComponent } from 'src/app/fleet/imports/roster-import-corrections/roster-import-corrections.component';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportDetail,
  RosterImportStatus,
  RosterImportSummary,
  RosterPreviewProblem,
  SETTLED_ROSTER_IMPORT_STATUSES,
} from 'src/app/models/fleet-import.models';
import { ResolvedStoFleet, StoFleet } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when the import could not be read for any reason but absence. */
export const ROSTER_IMPORT_STATUS_ERROR =
  'This import could not be read. Please try again.';

/** What to say when nothing answers to the address. */
export const ROSTER_IMPORT_STATUS_MISSING =
  'No import of this Fleet answers to that address.';

/** What to say to somebody who may not read a Fleet's imports. */
export const ROSTER_IMPORT_STATUS_NOT_PERMITTED =
  'Reading this Fleet’s imports is not something your account may do.';

/** What to say when the page was reached from an upload that was a repeat. */
export const ROSTER_IMPORT_STATUS_REPEATED =
  'This export was already imported; nothing new was stored.';

/** Who uploaded an import, once their account is gone. */
export const ROSTER_IMPORT_UPLOADER_GONE = 'An account that no longer exists';

/** The navigation state an upload leaves behind for this page. */
export interface RosterImportNavigationState {
  /** True when the upload was of a file this Fleet had already imported. */
  rosterImportRepeated?: boolean;
}

/** Where watching an import has got to. */
export interface RosterImportWatch {
  readonly detail: RosterImportDetail;

  /** True while the page is still asking by itself. */
  readonly watching: boolean;
}

/** What the page is showing. */
export type RosterImportStatusState =
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
  | {
      readonly kind: 'READY';
      /** The Fleet's section tabs, or null for a Fleet with none. */
      readonly tabs: FleetTabsVm | null;
      readonly fleet: StoFleet;
      readonly fleetLink: string[];
      readonly importsLink: string[];
      readonly communityId: string;
      readonly communitySlug: string;
      readonly platformSegment: string;
      readonly detail: RosterImportDetail;
      readonly watching: boolean;
    };

/** How the page's parts are addressed, once the Fleet is resolved. */
interface RosterImportContext {
  readonly resolved: ResolvedStoFleet;
  readonly communityId: string;
  readonly importId: string;
}

/**
 * One roster import, and where it has got to.
 *
 * An upload is accepted before it is done. The file goes into quarantine, a
 * scanner looks at it and only then is it read into the roster, so the
 * answer to the upload is an address rather than a result, and this is the
 * page at that address.
 *
 * ## Watching it
 *
 * While the import is still being scanned or read, the page asks again every
 * five seconds and stops by itself as soon as nothing further can happen to
 * it. It also stops after two minutes: a scan still running by then is
 * waiting on something, and the reader is given a button to ask again rather
 * than a page that asks forever.
 *
 * ## Who sees what
 *
 * Anybody who may import into the Fleet, or investigate its imports, may read
 * this page. The rows at fault and the other imports in a conflict are only
 * shown to an investigator; everybody else is told how many problems there
 * were. The server decides which, and sends nothing it has decided against.
 */
@Component({
  selector: 'app-roster-import-status',
  templateUrl: './roster-import-status.component.html',
  styleUrls: ['./roster-import-status.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FleetTabsComponent,
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsSuccessMessageComponent,
    LcarsWarningMessageComponent,
    LoadingBarComponent,
    RosterImportCorrectionsComponent,
  ],
})
export class RosterImportStatusComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _scopeService = inject(FleetScopeService);
  private readonly _importService = inject(RosterImportService);

  /** Asks the page to start watching again. */
  private readonly _checkAgain$ = new Subject<void>();

  /**
   * Whether the reader arrived from an upload of a file already imported.
   *
   * Read once, from the navigation that brought them here, so it is said on
   * arrival and not on every later visit to the same address.
   */
  readonly repeated =
    (inject(Location).getState() as RosterImportNavigationState | null)
      ?.rosterImportRepeated === true;

  /** What to say when the page was reached from a repeated upload. */
  readonly repeatedMessage = ROSTER_IMPORT_STATUS_REPEATED;

  /** What to say when nothing answers to the address. */
  readonly missingMessage = ROSTER_IMPORT_STATUS_MISSING;

  /** What to say when the import could not be read. */
  readonly errorMessage = ROSTER_IMPORT_STATUS_ERROR;

  /** What to say to a reader who may not read a Fleet's imports. */
  readonly notPermittedMessage = ROSTER_IMPORT_STATUS_NOT_PERMITTED;

  /** Who uploaded an import, once their account is gone. */
  readonly uploaderGone = ROSTER_IMPORT_UPLOADER_GONE;

  /** The import, and whether the page is still asking after it. */
  readonly state$: Observable<RosterImportStatusState> =
    this._route.paramMap.pipe(
      switchMap(params => this.load(params)),
      catchError((error: HttpErrorResponse) =>
        of<RosterImportStatusState>(
          error.status === 404 ? { kind: 'MISSING' } : { kind: 'ERROR' },
        ),
      ),
      startWith<RosterImportStatusState>({ kind: 'LOADING' }),
    );

  /** Starts watching the import again, after the page stopped by itself. */
  onCheckAgain(): void {
    this._checkAgain$.next();
  }

  /**
   * Names a status.
   *
   * @param status - The status.
   * @returns Its label.
   */
  statusLabel(status: RosterImportStatus): string {
    return ROSTER_IMPORT_STATUS_LABELS[status];
  }

  /**
   * Says what a status means, and why, where there is a reason.
   *
   * @param summary - The import.
   * @returns The sentence or two.
   */
  statusMessage(summary: RosterImportSummary): string {
    const reason = describeStatusReason(summary.statusReason);
    const description = ROSTER_IMPORT_STATUS_DESCRIPTIONS[summary.status];

    return reason === null ? description : `${description} ${reason}`;
  }

  /**
   * Which of the four message panels a status is drawn in.
   *
   * @param status - The status.
   * @returns The panel.
   */
  tone(status: RosterImportStatus): 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' {
    switch (status) {
      case RosterImportStatus.IMPORTED:
        return 'SUCCESS';
      case RosterImportStatus.HELD:
        return 'WARNING';
      case RosterImportStatus.REFUSED:
        return 'ERROR';
      default:
        return 'INFO';
    }
  }

  /**
   * Reports whether nothing further will happen to an import by itself.
   *
   * @param summary - The import.
   * @returns True once it has settled.
   */
  settled(summary: RosterImportSummary): boolean {
    return SETTLED_ROSTER_IMPORT_STATUSES.includes(summary.status);
  }

  /**
   * Says why one row could not be read.
   *
   * @param problem - What the server found.
   * @returns The sentence.
   */
  rowProblem(problem: RosterPreviewProblem): string {
    return ROSTER_ROW_REJECTIONS[problem.code];
  }

  /**
   * Links to another import of the same Fleet.
   *
   * @param state - The page, with the Fleet it resolved.
   * @param importId - The other import.
   * @returns The router link.
   */
  importLink(
    state: Extract<RosterImportStatusState, { kind: 'READY' }>,
    importId: string,
  ): string[] {
    return FLEET_LINKS.fleetRosterImport(
      state.communitySlug,
      state.platformSegment,
      state.fleet.slug,
      importId,
    );
  }

  /**
   * Links to where the Fleet's conflicting exports are chosen between.
   *
   * @param state - The page, with the Fleet it resolved.
   * @returns The router link.
   */
  conflictsLink(
    state: Extract<RosterImportStatusState, { kind: 'READY' }>,
  ): string[] {
    return FLEET_LINKS.fleetRosterConflicts(
      state.communitySlug,
      state.platformSegment,
      state.fleet.slug,
    );
  }

  /**
   * Resolves the Fleet the address names, and then watches the import.
   *
   * @param params - The address, in segments.
   * @returns The page's state, as it changes.
   */
  private load(params: ParamMap): Observable<RosterImportStatusState> {
    const communitySlug = params.get('communitySlug') ?? '';
    const platformSegment = params.get('platformSegment') ?? '';
    const slug = params.get('slug') ?? '';
    const importId = params.get('importId') ?? '';

    return this._scopeService
      .resolveFleet(communitySlug, platformSegment, slug)
      .pipe(
        switchMap(resolved => {
          const fleetLink = FLEET_LINKS.fleet(
            resolved.communitySlug,
            resolved.platformSegment,
            resolved.fleet.slug,
          );

          // A Fleet no Community holds has no imports to read, and one the
          // reader may not read is refused here rather than asked about.
          if (resolved.fleet.communityId === null) {
            return of<RosterImportStatusState>({ kind: 'MISSING' });
          }

          if (
            !ROSTER_IMPORT_READERS.some(capability =>
              resolved.viewer.capabilities.includes(capability),
            )
          ) {
            return of<RosterImportStatusState>({
              kind: 'NOT_PERMITTED',
              tabs: fleetTabsVmOf(resolved),
              fleet: resolved.fleet,
              fleetLink,
            });
          }

          const context: RosterImportContext = {
            resolved,
            communityId: resolved.fleet.communityId,
            importId,
          };

          return this._checkAgain$.pipe(
            startWith(undefined),
            switchMap(() => this.watch(context)),
            map((watch): RosterImportStatusState => ({
              kind: 'READY',
              tabs: fleetTabsVmOf(resolved),
              fleet: resolved.fleet,
              fleetLink,
              importsLink: FLEET_LINKS.fleetRosterImports(
                resolved.communitySlug,
                resolved.platformSegment,
                resolved.fleet.slug,
              ),
              communityId: context.communityId,
              communitySlug: resolved.communitySlug,
              platformSegment: resolved.platformSegment,
              detail: watch.detail,
              watching: watch.watching,
            })),
          );
        }),
      );
  }

  /**
   * Reads an import, and again every few seconds until it settles.
   *
   * `exhaustMap` rather than `switchMap`, so a slow answer is waited for
   * rather than abandoned for the next question. Stops by itself once the
   * import has settled, or once the window has passed; in the second case
   * one last state is emitted saying the page has stopped asking, so the
   * reader can be offered a way to ask again.
   *
   * @param context - The Fleet and the import.
   * @returns The import, as it changes.
   */
  private watch(context: RosterImportContext): Observable<RosterImportWatch> {
    let latest: RosterImportDetail | null = null;

    const reads$ = timer(0, ROSTER_IMPORT_POLL_INTERVAL_MS).pipe(
      exhaustMap(() =>
        this._importService.detail(
          context.communityId,
          context.resolved.fleet.id,
          context.importId,
        ),
      ),
      tap(detail => (latest = detail)),
      takeWhile(detail => !this.settled(detail), true),
      takeUntil(timer(ROSTER_IMPORT_POLL_WINDOW_MS)),
      map(detail => ({ detail, watching: !this.settled(detail) })),
    );

    const stopped$ = defer(() =>
      latest !== null && !this.settled(latest)
        ? of({ detail: latest, watching: false })
        : EMPTY,
    );

    return concat(reads$, stopped$);
  }
}
