import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

import {
  catchError,
  combineLatest,
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
  ROSTER_IMPORT_CAPABILITY,
  ROSTER_IMPORT_READERS,
} from 'src/app/fleet/imports/roster-import.constants';
import { ROSTER_IMPORT_STATUS_LABELS } from 'src/app/fleet/imports/roster-import.messages';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportPage,
  RosterImportStatus,
} from 'src/app/models/fleet-import.models';
import { ResolvedStoFleet, StoFleet } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ROSTER_IMPORT_UPLOADER_GONE } from '../roster-import-status/roster-import-status.component';

/** What to say when the imports could not be read for any reason but absence. */
export const ROSTER_IMPORT_LIST_ERROR =
  'This Fleet’s imports could not be read. Please try again.';

/** What to say when nothing answers to the address. */
export const ROSTER_IMPORT_LIST_MISSING =
  'No Fleet here answers to that address. It may have been closed, or the ' +
  'address may have changed.';

/** What to say to somebody who may not read a Fleet's imports. */
export const ROSTER_IMPORT_LIST_NOT_PERMITTED =
  'Reading this Fleet’s imports is not something your account may do.';

/** What to say when nothing has been imported. */
export const ROSTER_IMPORT_LIST_EMPTY =
  'Nothing has been imported into this Fleet yet.';

/** What the page is showing. */
export type RosterImportListState =
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
      readonly communitySlug: string;
      readonly platformSegment: string;

      /** Where to import another, or null for somebody who may not. */
      readonly importFormLink: string[] | null;
      readonly page: RosterImportPage;
    };

/**
 * A Fleet's roster imports, newest first.
 *
 * Paged as the directories are, with the page in the address so it survives
 * a reload and the back button. Each import is a line saying what the file
 * was, where it has got to and who sent it, and links to its own page. What
 * went wrong with one is on that page, and only for somebody who
 * investigates imports; a listing is read by more people, more often.
 */
@Component({
  selector: 'app-roster-import-list',
  templateUrl: './roster-import-list.component.html',
  styleUrls: ['./roster-import-list.component.scss'],
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
export class RosterImportListComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _scopeService = inject(FleetScopeService);
  private readonly _importService = inject(RosterImportService);

  /** What to say when nothing answers to the address. */
  readonly missingMessage = ROSTER_IMPORT_LIST_MISSING;

  /** What to say when the imports could not be read. */
  readonly errorMessage = ROSTER_IMPORT_LIST_ERROR;

  /** What to say to a reader who may not read a Fleet's imports. */
  readonly notPermittedMessage = ROSTER_IMPORT_LIST_NOT_PERMITTED;

  /** What to say when nothing has been imported. */
  readonly emptyMessage = ROSTER_IMPORT_LIST_EMPTY;

  /** Who uploaded an import, once their account is gone. */
  readonly uploaderGone = ROSTER_IMPORT_UPLOADER_GONE;

  /** The Fleet and a page of its imports. */
  readonly state$: Observable<RosterImportListState> = combineLatest([
    this._route.paramMap,
    this._route.queryParamMap,
  ]).pipe(
    switchMap(([params, query]) =>
      this.load(params, pageOf(query)).pipe(
        startWith<RosterImportListState>({ kind: 'LOADING' }),
      ),
    ),
    catchError((error: HttpErrorResponse) =>
      of<RosterImportListState>(
        error.status === 404 ? { kind: 'MISSING' } : { kind: 'ERROR' },
      ),
    ),
  );

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
   * How many pages the listing runs to.
   *
   * @param page - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(page: RosterImportPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Links to one import.
   *
   * @param state - The page, with the Fleet it resolved.
   * @param importId - The import.
   * @returns The router link.
   */
  importLink(
    state: Extract<RosterImportListState, { kind: 'READY' }>,
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
   * Turns to another page, keeping it in the address.
   *
   * The first page is the address without a page, so there is one address
   * for it rather than two.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Resolves the Fleet the address names, then reads a page of its imports.
   *
   * @param params - The address, in segments.
   * @param page - The page asked for.
   * @returns The page's state.
   */
  private load(
    params: ParamMap,
    page: number,
  ): Observable<RosterImportListState> {
    const communitySlug = params.get('communitySlug') ?? '';
    const platformSegment = params.get('platformSegment') ?? '';
    const slug = params.get('slug') ?? '';

    return this._scopeService
      .resolveFleet(communitySlug, platformSegment, slug)
      .pipe(switchMap(resolved => this.present(resolved, page)));
  }

  /**
   * Decides what the page shows about a resolved Fleet.
   *
   * @param resolved - The Fleet, as the server resolved it.
   * @param page - The page asked for.
   * @returns The page's state.
   */
  private present(
    resolved: ResolvedStoFleet,
    page: number,
  ): Observable<RosterImportListState> {
    const { fleet, viewer } = resolved;
    const fleetLink = FLEET_LINKS.fleet(
      resolved.communitySlug,
      resolved.platformSegment,
      fleet.slug,
    );

    // A Fleet no Community holds has no imports to list.
    if (fleet.communityId === null) {
      return of<RosterImportListState>({ kind: 'MISSING' });
    }

    if (
      !ROSTER_IMPORT_READERS.some(capability =>
        viewer.capabilities.includes(capability),
      )
    ) {
      return of<RosterImportListState>({
        kind: 'NOT_PERMITTED',
        tabs: fleetTabsVmOf(resolved),
        fleet,
        fleetLink,
      });
    }

    const mayImport =
      fleet.platformProvidesRosterExport &&
      viewer.capabilities.includes(ROSTER_IMPORT_CAPABILITY);

    return this._importService.list(fleet.communityId, fleet.id, page).pipe(
      map((imports): RosterImportListState => ({
        kind: 'READY',
        tabs: fleetTabsVmOf(resolved),
        fleet,
        fleetLink,
        communitySlug: resolved.communitySlug,
        platformSegment: resolved.platformSegment,
        importFormLink: mayImport
          ? FLEET_LINKS.fleetRosterImportForm(
              resolved.communitySlug,
              resolved.platformSegment,
              fleet.slug,
            )
          : null,
        page: imports,
      })),
    );
  }
}

/**
 * Reads the page asked for out of the address.
 *
 * Anything that is not a whole number from one upwards is the first page,
 * rather than a request the server would refuse.
 *
 * @param query - The address's query.
 * @returns The page, from 1.
 */
function pageOf(query: ParamMap): number {
  const page = Number(query.get('page'));

  return Number.isInteger(page) && page >= 1 ? page : 1;
}
