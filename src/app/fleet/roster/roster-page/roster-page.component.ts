import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { ROSTER_VIEW_CAPABILITY } from 'src/app/fleet/roster/roster.constants';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  RosterPage,
  RosterProfileLink,
  RosterQuery,
  RosterRow,
  RosterSort,
  RosterSortDirection,
} from 'src/app/models/fleet-roster.models';
import { ROOT_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import {
  endOfLocalDay,
  localDayOf,
} from 'src/app/shared/utils/zoned-day.utils';

/** What to say to somebody who may not read the roster. */
export const ROSTER_NOT_PERMITTED =
  'The roster is for the Fleet’s members. Following its Community does not ' +
  'open it.';

/** The roster's columns a reader can sort by, in the order they are drawn. */
export const ROSTER_SORTS: readonly {
  readonly sort: RosterSort;
  readonly label: string;
  /** The way a first press sorts: the end a reader looks for first. */
  readonly firstDirection: RosterSortDirection;
}[] = [
  {
    sort: RosterSort.NAME,
    label: 'Character',
    firstDirection: RosterSortDirection.ASC,
  },
  {
    sort: RosterSort.HANDLE,
    label: 'Handle',
    firstDirection: RosterSortDirection.ASC,
  },
  {
    sort: RosterSort.RANK,
    label: 'Rank',
    firstDirection: RosterSortDirection.ASC,
  },
  {
    sort: RosterSort.LEVEL,
    label: 'Level',
    firstDirection: RosterSortDirection.DESC,
  },
  {
    sort: RosterSort.JOINED,
    label: 'Joined',
    firstDirection: RosterSortDirection.ASC,
  },
  {
    sort: RosterSort.CONTRIBUTION,
    label: 'Contribution',
    firstDirection: RosterSortDirection.DESC,
  },
  {
    sort: RosterSort.LAST_ACTIVE,
    label: 'Last Active',
    firstDirection: RosterSortDirection.DESC,
  },
];

/** The roster, and what the reader asked of it. */
export interface RosterPageData {
  readonly page: RosterPage;
  readonly query: RosterQuery;
  /** The reader's display timezone, which days are picked in. */
  readonly timezone: string;
  /** How the address names the Fleet, for links to its members. */
  readonly section: FleetSection;
}

/**
 * A Fleet's roster, as one export listed it (FC-020).
 *
 * For the Fleet's members and up, who are shown handles, Public Comments and
 * Last Active (plan R10). The latest export by default; a reader can pick a
 * day, in their own timezone, and is shown the last export on or before it,
 * or step to the export either side.
 *
 * Everything the reader chooses is in the address — the export, the page,
 * the ordering, the search and the rank — so a view can be bookmarked,
 * shared with another member and reached with the back button.
 */
@Component({
  selector: 'app-roster-page',
  templateUrl: './roster-page.component.html',
  styleUrls: ['./roster-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class RosterPageComponent extends FleetSectionPageDirective<RosterPageData> {
  private readonly _router = inject(Router);
  private readonly _rosterService = inject(RosterService);
  private readonly _settingsService = inject(UserSettingsService);

  readonly notPermittedMessage = ROSTER_NOT_PERMITTED;
  readonly sorts = ROSTER_SORTS;

  protected readonly _requiredCapabilities = [ROSTER_VIEW_CAPABILITY];

  /**
   * The day an instant fell on, in the reader's timezone.
   *
   * @param data - The page, with the reader's timezone.
   * @param instant - The instant.
   * @returns The day, as the date control takes it.
   */
  dayOf(data: RosterPageData, instant: string): string {
    return localDayOf(instant, data.timezone);
  }

  /**
   * How a column is sorted now, for a screen reader.
   *
   * @param data - The page.
   * @param sort - The column.
   * @returns Its `aria-sort`.
   */
  ariaSort(
    data: RosterPageData,
    sort: RosterSort,
  ): 'ascending' | 'descending' | 'none' {
    if (data.query.sort !== sort) {
      return 'none';
    }

    return data.query.direction === RosterSortDirection.DESC
      ? 'descending'
      : 'ascending';
  }

  /**
   * How many pages the roster runs to.
   *
   * @param page - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(page: RosterPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Writes a whole number with its thousands separated.
   *
   * @param value - The number, as a decimal string: a contribution total can
   *   be larger than a JavaScript number holds exactly.
   * @returns It, written out.
   */
  whole(value: string): string {
    return BigInt(value).toLocaleString('en-GB');
  }

  /**
   * Where a member's timeline is.
   *
   * @param data - The page, with the Fleet's address.
   * @param identityId - The member.
   * @returns The router link.
   */
  memberLink(data: RosterPageData, identityId: string): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetMember(
      communitySlug,
      platformSegment,
      fleetSlug,
      identityId,
    );
  }

  /**
   * Where a Character's registry page is.
   *
   * @param profile - Its path.
   * @returns The router link.
   */
  profileLink(profile: RosterProfileLink): string[] {
    return [
      '/' + ROOT_ROUTES.COMMUNITY,
      'registry',
      'profiles',
      profile.username,
      profile.accountSlug,
      profile.characterSlug,
    ];
  }

  /**
   * Identifies a row among the rows of its export.
   *
   * @param row - The row.
   * @returns Its line, which is unique on an export.
   */
  trackRow(row: RosterRow): number {
    return row.line;
  }

  /**
   * Shows the roster on a day the reader picked.
   *
   * @param data - The page, with the reader's timezone.
   * @param day - The day, `YYYY-MM-DD`, or empty for the latest export.
   */
  onDay(data: RosterPageData, day: string): void {
    this.navigate({ asOf: endOfLocalDay(day, data.timezone), page: null });
  }

  /**
   * Shows the roster as one export listed it.
   *
   * @param exportedAt - The export's instant, or null for the latest.
   */
  onExport(exportedAt: string | null): void {
    this.navigate({ asOf: exportedAt, page: null });
  }

  /**
   * Orders the roster by a column: the column's first way on a first press,
   * the other way on a second.
   *
   * @param data - The page.
   * @param sort - The column.
   */
  onSort(data: RosterPageData, sort: RosterSort): void {
    // Only the header of a listed column calls this.
    const column = ROSTER_SORTS.find(
      entry => entry.sort === sort,
    ) as (typeof ROSTER_SORTS)[number];
    // The address always names one: rosterQueryOf defaults it.
    const current = data.query.sort;
    const direction =
      current === sort
        ? data.query.direction === RosterSortDirection.DESC
          ? RosterSortDirection.ASC
          : RosterSortDirection.DESC
        : column.firstDirection;

    this.navigate({
      sort: sort === RosterSort.NAME ? null : sort,
      dir: direction.toLowerCase(),
      page: null,
    });
  }

  /**
   * Searches and filters the roster, from the first page.
   *
   * @param search - A Character name or handle, or part of one.
   * @param rank - A rank label, or empty for every rank.
   */
  onFilter(search: string, rank: string): void {
    this.navigate({
      q: search.trim() === '' ? null : search.trim(),
      rank: rank === '' ? null : rank,
      page: null,
    });
  }

  /**
   * Turns to another page, keeping it in the address.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
  }

  /**
   * Reads the roster the address asks for.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns The page, with the reader's timezone.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<RosterPageData> {
    const request = rosterQueryOf(query);

    return this._rosterService
      .roster(section.communityId, section.fleetId, request)
      .pipe(
        map(page => ({
          page,
          query: request,
          timezone: this._settingsService.displayTimezone(),
          section,
        })),
      );
  }

  /**
   * Changes the address's query, keeping the rest.
   *
   * @param queryParams - What to change; null removes it.
   */
  private navigate(queryParams: Record<string, string | number | null>): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}

/**
 * Reads what the address asks of the roster.
 *
 * Anything that is not one of the orderings is the default, rather than a
 * request the server would refuse.
 *
 * @param query - The address's query.
 * @returns The request.
 */
export function rosterQueryOf(query: ParamMap): RosterQuery {
  const page = Number(query.get('page'));
  const sort = query.get('sort');
  const direction = query.get('dir');

  return {
    asOf: query.get('asOf') ?? undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sort: ROSTER_SORTS.some(entry => entry.sort === sort)
      ? (sort as RosterSort)
      : RosterSort.NAME,
    direction:
      direction === 'desc' ? RosterSortDirection.DESC : RosterSortDirection.ASC,
    search: query.get('q') ?? undefined,
    rank: query.get('rank') ?? undefined,
  };
}
