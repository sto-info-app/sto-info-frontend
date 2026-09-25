import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { ROSTER_INVESTIGATE_CAPABILITY } from 'src/app/fleet/imports/roster-import.constants';
import { ROSTER_IMPORT_STATUS_LABELS } from 'src/app/fleet/imports/roster-import.messages';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  RosterImportConflictFilter,
  RosterImportConflictGroup,
  RosterImportConflictPage,
  RosterImportStatus,
  RosterImportSummary,
} from 'src/app/models/fleet-import.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not settle conflicts. */
export const ROSTER_CONFLICTS_NOT_PERMITTED =
  'Settling this Fleet’s conflicting exports is for its roster investigators.';

/** What to say when a selection failed for a reason the server did not give. */
export const ROSTER_CONFLICT_SELECT_FAILED =
  'That export could not be selected. Please try again.';

/** The most a reason may say, as the server allows. */
export const ROSTER_CONFLICT_REASON_LIMIT = 500;

/** The groups a reader can list, in the order offered, with their names. */
export const ROSTER_CONFLICT_FILTERS: readonly {
  readonly state: RosterImportConflictFilter;
  readonly label: string;
  /** What to say when there are none. */
  readonly empty: string;
}[] = [
  {
    state: RosterImportConflictFilter.OPEN,
    label: 'Waiting',
    empty: 'No exports of this Fleet are waiting for a selection.',
  },
  {
    state: RosterImportConflictFilter.SETTLED,
    label: 'Settled',
    empty: 'No conflict between this Fleet’s exports has been settled yet.',
  },
  {
    state: RosterImportConflictFilter.ALL,
    label: 'All',
    empty: 'No two exports of this Fleet have claimed the same moment.',
  },
];

/**
 * The export a selection made stand, as the notice names it: by its file and
 * when it was uploaded, since every export in a group is named for the same
 * moment and often has the same file name.
 */
export interface RosterConflictNotice {
  readonly filename: string;
  readonly uploadedAt: string;
  /** Whether it had been held, and so is read into the history now. */
  readonly held: boolean;
}

/** A page of conflict groups, and which the reader asked for. */
export interface RosterConflictsData {
  readonly page: RosterImportConflictPage;
  readonly state: RosterImportConflictFilter;
  readonly section: FleetSection;
}

/**
 * The exports of a Fleet that claim one moment and disagree, for its
 * investigators to choose between (FC-020).
 *
 * Each group lists its exports as they arrived, and the one selected to
 * stand for the moment. An investigator selects another with a reason; a
 * held export is then read into force and the roster history rebuilt,
 * which the server does on its own queue. A group reopened by a later
 * export that disagrees keeps its selection until somebody changes it
 * (Steve's decision of 25 September 2026: the choice is made here).
 */
@Component({
  selector: 'app-roster-conflicts',
  templateUrl: './roster-conflicts.component.html',
  styleUrls: ['./roster-conflicts.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class RosterConflictsComponent extends FleetSectionPageDirective<RosterConflictsData> {
  private readonly _router = inject(Router);
  private readonly _importService = inject(RosterImportService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = ROSTER_CONFLICTS_NOT_PERMITTED;
  readonly filters = ROSTER_CONFLICT_FILTERS;
  readonly statusLabels = ROSTER_IMPORT_STATUS_LABELS;
  readonly reasonLimit = ROSTER_CONFLICT_REASON_LIMIT;

  protected readonly _requiredCapabilities = [ROSTER_INVESTIGATE_CAPABILITY];

  /** The reason typed for each group, by its id. */
  readonly reasons = signal<Readonly<Record<string, string>>>({});

  /** The group a selection is being made in, if any. */
  readonly busy = signal<string | null>(null);

  /** What the last selection came to, if it was refused or failed. */
  readonly selectError = signal<string | null>(null);

  /** What the last selection came to, if it was recorded. */
  readonly selectNotice = signal<RosterConflictNotice | null>(null);

  /**
   * What to say when the reader's list is empty.
   *
   * @param data - The page.
   * @returns The sentence.
   */
  emptyMessage(data: RosterConflictsData): string {
    // Every state the page reads is one of the filters.
    return (
      ROSTER_CONFLICT_FILTERS.find(
        filter => filter.state === data.state,
      ) as (typeof ROSTER_CONFLICT_FILTERS)[number]
    ).empty;
  }

  /**
   * The address's query for another list, from its first page.
   *
   * @param state - The groups to list.
   * @returns The query to merge.
   */
  queryFor(state: RosterImportConflictFilter): Record<string, string | null> {
    return {
      state:
        state === RosterImportConflictFilter.OPEN ? null : state.toLowerCase(),
      page: null,
    };
  }

  /**
   * Where an export's own page is.
   *
   * @param data - The page, with the Fleet's address.
   * @param member - The export.
   * @returns The router link.
   */
  importLink(data: RosterConflictsData, member: RosterImportSummary): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetRosterImport(
      communitySlug,
      platformSegment,
      fleetSlug,
      member.id,
    );
  }

  /**
   * The reason typed for a group.
   *
   * @param group - The group.
   * @returns The reason, or empty.
   */
  reasonOf(group: RosterImportConflictGroup): string {
    return this.reasons()[group.id] ?? '';
  }

  /**
   * Whether an export may be selected for its group now.
   *
   * @param group - The group.
   * @param member - The export.
   * @returns False when it stands already, is excluded, a reason is still
   *   to be given, or a selection is under way.
   */
  canSelect(
    group: RosterImportConflictGroup,
    member: RosterImportSummary,
  ): boolean {
    return (
      this.busy() === null &&
      member.id !== group.selectedImportId &&
      !member.excluded &&
      this.reasonOf(group).trim() !== ''
    );
  }

  /**
   * How many pages the list runs to.
   *
   * @param page - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(page: RosterImportConflictPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Types a reason for a group.
   *
   * @param groupId - The group.
   * @param reason - What was typed.
   */
  onReason(groupId: string, reason: string): void {
    this.reasons.update(reasons => ({ ...reasons, [groupId]: reason }));
  }

  /**
   * Selects an export to stand for its group's moment, then reads the list
   * again: either way, what it showed is no longer how things stand.
   *
   * @param data - The page.
   * @param group - The group.
   * @param member - The export.
   */
  onSelect(
    data: RosterConflictsData,
    group: RosterImportConflictGroup,
    member: RosterImportSummary,
  ): void {
    this.busy.set(group.id);
    this.selectError.set(null);
    this.selectNotice.set(null);
    this._importService
      .select(
        data.section.communityId,
        data.section.fleetId,
        member.id,
        this.reasonOf(group).trim(),
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(null);
          this.reasons.update(reasons => {
            const rest = { ...reasons };

            delete rest[group.id];

            return rest;
          });
          this.selectNotice.set({
            filename: member.originalFilename,
            uploadedAt: member.uploadedAt,
            held: member.status === RosterImportStatus.HELD,
          });
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(null);
          this.selectError.set(refusalOf(error));
          this.reload();
        },
      });
  }

  /**
   * Turns to another page, keeping it in the address.
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
   * Reads the groups the address asks for.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns The page, with the state listed.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<RosterConflictsData> {
    const asked = (query.get('state') ?? '').toUpperCase();
    const state =
      ROSTER_CONFLICT_FILTERS.find(filter => filter.state === asked)?.state ??
      RosterImportConflictFilter.OPEN;
    const pageNumber = Number(query.get('page'));

    return this._importService
      .conflicts(
        section.communityId,
        section.fleetId,
        state,
        Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1,
      )
      .pipe(map(page => ({ page, state, section })));
  }
}

/**
 * Says why a selection was refused.
 *
 * @param error - The refusal.
 * @returns The server's own sentence when it refused a selection it
 *   understood — already selected, excluded, or no longer in a conflict —
 *   and a general one otherwise.
 */
function refusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return error.status === HttpStatusCode.Conflict && typeof message === 'string'
    ? message
    : ROSTER_CONFLICT_SELECT_FAILED;
}
