import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { describeRosterChange } from 'src/app/fleet/roster/roster-change.text';
import { ROSTER_VIEW_CAPABILITY } from 'src/app/fleet/roster/roster.constants';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  RosterChange,
  RosterEpisode,
  RosterEpisodeEnd,
  RosterEpisodeStart,
  RosterProfileLink,
  RosterTimeline,
} from 'src/app/models/fleet-roster.models';
import {
  ChartDataItem,
  SmartChartComponent,
} from 'src/app/shared/components/smart-chart/smart-chart.component';
import { ROOT_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the history. */
export const ROSTER_TIMELINE_NOT_PERMITTED =
  'A member’s history is for the Fleet’s members. Following its Community ' +
  'does not open it.';

/** What to say when the Fleet or the member does not answer. */
export const ROSTER_TIMELINE_MISSING =
  'Nothing here answers to that address: not the Fleet, or not this member ' +
  'of it. The member may have been joined to another by a confirmed rename.';

/** How an episode is known to have begun, in words. */
const STARTS: Readonly<Record<RosterEpisodeStart, string>> = {
  [RosterEpisodeStart.FIRST_SEEN]: 'Already listed',
  [RosterEpisodeStart.JOINED]: 'Joined',
  [RosterEpisodeStart.REJOINED]: 'Rejoined',
};

/** How an episode is known to have ended, in words. */
const ENDS: Readonly<Record<RosterEpisodeEnd, string>> = {
  [RosterEpisodeEnd.LEFT]: 'Left',
  [RosterEpisodeEnd.LEFT_AND_REJOINED]: 'Left, and came back',
};

/** One member's timeline, and the Fleet it is in. */
export interface RosterTimelineData {
  readonly timeline: RosterTimeline;
  readonly section: FleetSection;
}

/**
 * One member's history in a Fleet (FC-020).
 *
 * For the Fleet's members. Their stretches of membership, bounded by the
 * exports either side; every change, contribution included, oldest first;
 * and their row on each export listing them, with the contribution drawn
 * export by export (Steve's decisions of 25 September 2026). The registry
 * link follows the roster's rule, for the latest export listing them.
 */
@Component({
  selector: 'app-roster-timeline',
  templateUrl: './roster-timeline.component.html',
  styleUrls: ['./roster-timeline.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    SmartChartComponent,
  ],
})
export class RosterTimelineComponent extends FleetSectionPageDirective<RosterTimelineData> {
  private readonly _rosterService = inject(RosterService);
  private readonly _datePipe = inject(AppDatePipe);

  readonly notPermittedMessage = ROSTER_TIMELINE_NOT_PERMITTED;
  override readonly missingMessage = ROSTER_TIMELINE_MISSING;

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
      value => this.whole(value),
      instant => this.day(instant),
    );
  }

  /**
   * How an episode began, in words.
   *
   * @param episode - The episode.
   * @returns The words.
   */
  startOf(episode: RosterEpisode): string {
    return STARTS[episode.startKind];
  }

  /**
   * How an episode ended, in words.
   *
   * @param episode - The episode.
   * @returns The words; still listed while it has not.
   */
  endOf(episode: RosterEpisode): string {
    return episode.endKind === null ? 'Still listed' : ENDS[episode.endKind];
  }

  /**
   * The member's contribution total at each export, for the chart.
   *
   * @param timeline - The timeline.
   * @returns One bar per export listing them, oldest first.
   */
  contributionChart(timeline: RosterTimeline): ChartDataItem[] {
    return timeline.rows.map(row => ({
      name: this.day(row.exportedAt),
      count: Number(row.contributionTotal),
    }));
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
   * Where the Fleet's history is.
   *
   * @param data - The timeline, with the Fleet's address.
   * @returns The router link.
   */
  historyLink(data: RosterTimelineData): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetHistory(communitySlug, platformSegment, fleetSlug);
  }

  /**
   * Reads the member the address names.
   *
   * @param section - The Fleet.
   * @param _query - The address's query, unused.
   * @param params - The address, naming the member.
   * @returns Their timeline.
   */
  protected load(
    section: FleetSection,
    _query: ParamMap,
    params: ParamMap,
  ): Observable<RosterTimelineData> {
    return this._rosterService
      .timeline(
        section.communityId,
        section.fleetId,
        // The route has no address without one.
        params.get('identityId') as string,
      )
      .pipe(map(timeline => ({ timeline, section })));
  }

  /**
   * Writes an instant as the reader's date.
   *
   * @param instant - The instant.
   * @returns The date.
   */
  private day(instant: string): string {
    // An instant the server sent always formats.
    return this._datePipe.transform(instant) as string;
  }
}
