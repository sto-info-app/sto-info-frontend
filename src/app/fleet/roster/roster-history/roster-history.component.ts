import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  describeRosterChange,
  ROSTER_CHANGE_KIND_LABELS,
} from 'src/app/fleet/roster/roster-change.text';
import { ROSTER_VIEW_CAPABILITY } from 'src/app/fleet/roster/roster.constants';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  ROSTER_HISTORY_KINDS,
  RosterChange,
  RosterChangeKind,
  RosterHistoryPage,
} from 'src/app/models/fleet-roster.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the history. */
export const ROSTER_HISTORY_NOT_PERMITTED =
  'The roster history is for the Fleet’s members. Following its Community ' +
  'does not open it.';

/** The history, and what the reader asked of it. */
export interface RosterHistoryData {
  readonly page: RosterHistoryPage;
  /** The kinds shown; every one when empty. */
  readonly kinds: readonly RosterChangeKind[];
  /** How the address names the Fleet, for links to its members. */
  readonly section: FleetSection;
}

/**
 * A Fleet's roster history, interval by interval, newest first (FC-020).
 *
 * For the Fleet's members. Each interval between two exports shows its
 * summary and the joins, departures, renames, rank and Join Date changes its
 * later export revealed; contribution appears only as each interval's totals
 * (Steve's decision of 25 September 2026). Nothing is dated more exactly than
 * the two exports a change lies between, and a change bounded more widely
 * than its interval says so.
 */
@Component({
  selector: 'app-roster-history',
  templateUrl: './roster-history.component.html',
  styleUrls: ['./roster-history.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class RosterHistoryComponent extends FleetSectionPageDirective<RosterHistoryData> {
  private readonly _router = inject(Router);
  private readonly _rosterService = inject(RosterService);
  private readonly _datePipe = inject(AppDatePipe);

  readonly notPermittedMessage = ROSTER_HISTORY_NOT_PERMITTED;
  readonly kinds = ROSTER_HISTORY_KINDS;
  readonly kindLabels = ROSTER_CHANGE_KIND_LABELS;

  protected readonly _requiredCapabilities = [ROSTER_VIEW_CAPABILITY];

  /**
   * Says what a change was.
   *
   * @param change - The change.
   * @returns The phrase following the member's name.
   */
  describe(change: RosterChange): string {
    return describeRosterChange(
      change,
      // Uses nothing of the component, so passes as it is. The History tab
      // lists no contribution changes, which are what it writes.
      this.whole,
      // An instant the server sent always formats.
      instant => this._datePipe.transform(instant) as string,
    );
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
   * Where a member's timeline is.
   *
   * @param data - The history, with the Fleet's address.
   * @param identityId - The member.
   * @returns The router link.
   */
  memberLink(data: RosterHistoryData, identityId: string): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetMember(
      communitySlug,
      platformSegment,
      fleetSlug,
      identityId,
    );
  }

  /**
   * Whether a kind is shown.
   *
   * @param data - The history.
   * @param kind - The kind.
   * @returns True when it is: every kind is, when none was picked.
   */
  isShown(data: RosterHistoryData, kind: RosterChangeKind): boolean {
    return data.kinds.length === 0 || data.kinds.includes(kind);
  }

  /**
   * Whether a kind's box may be cleared: not when it is the only one shown,
   * since a history showing nothing is not one anybody asked for.
   *
   * @param data - The history.
   * @param kind - The kind.
   * @returns True when clearing it is refused.
   */
  isLastShown(data: RosterHistoryData, kind: RosterChangeKind): boolean {
    return data.kinds.length === 1 && data.kinds[0] === kind;
  }

  /**
   * How many pages the history runs to.
   *
   * @param page - The page the server sent.
   * @returns The page count, or zero when there is nothing to page through.
   */
  totalPages(page: RosterHistoryPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Shows or hides a kind, from the first page.
   *
   * Every kind at once is the address without a filter, so there is one
   * address for it rather than two.
   *
   * @param data - The history.
   * @param kind - The kind.
   * @param shown - Whether to show it now.
   */
  onKind(
    data: RosterHistoryData,
    kind: RosterChangeKind,
    shown: boolean,
  ): void {
    const current =
      data.kinds.length === 0 ? [...ROSTER_HISTORY_KINDS] : [...data.kinds];
    const next = shown
      ? ROSTER_HISTORY_KINDS.filter(
          candidate => candidate === kind || current.includes(candidate),
        )
      : current.filter(candidate => candidate !== kind);

    this.navigate({
      kinds:
        next.length === ROSTER_HISTORY_KINDS.length ? null : next.join(','),
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
   * Reads the history the address asks for.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns The page, with the kinds shown.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<RosterHistoryData> {
    const pageNumber = Number(query.get('page'));
    const kinds = (query.get('kinds') ?? '')
      .split(',')
      .filter((kind): kind is RosterChangeKind =>
        ROSTER_HISTORY_KINDS.includes(kind as RosterChangeKind),
      );

    return this._rosterService
      .history(
        section.communityId,
        section.fleetId,
        Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1,
        kinds,
      )
      .pipe(map(page => ({ page, kinds, section })));
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
