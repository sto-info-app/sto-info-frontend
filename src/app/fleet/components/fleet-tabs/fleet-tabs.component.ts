import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { catchError, map, of, switchMap } from 'rxjs';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { ROSTER_IMPORT_READERS } from 'src/app/fleet/imports/roster-import.constants';
import { GOVERNANCE_READER_ROLES } from 'src/app/fleet/governance/governance.constants';
import { RECRUITMENT_TAB_CAPABILITIES } from 'src/app/fleet/recruitment/recruitment.constants';
import { ROSTER_VIEW_CAPABILITY } from 'src/app/fleet/roster/roster.constants';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

/** What the strip needs to know about the Fleet it sits on. */
export interface FleetTabsVm {
  /** The Community holding the Fleet, for asking which reports are shown. */
  readonly communityId: string;
  readonly fleetId: string;
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly fleetSlug: string;
  /**
   * Whether the game writes a roster export on the Fleet's platform. Without
   * one there is no roster, history, report or investigation to offer.
   */
  readonly providesRoster: boolean;
  /** What the reader may do here, which decides the tabs they are offered. */
  readonly capabilities: readonly string[];
  /** The role labels the reader holds here, which decide the Manage tab. */
  readonly roles: readonly string[];
}

/** One tab in the strip. */
export interface FleetTab {
  readonly link: string[];
  readonly label: string;
  /** Whether it lights on its own address alone. */
  readonly exact: boolean;
}

/**
 * Works out the strip for a resolved Fleet.
 *
 * @param resolved - The Fleet, as the server resolved it.
 * @returns The strip's view model, or null for a Fleet no Community holds,
 *   which has no sections: nobody imports into it or recruits to it. A Fleet
 *   on a platform with no roster export still has one, for its recruitment
 *   (FC-021) and its holdings (FC-023).
 */
export function fleetTabsVmOf(resolved: ResolvedStoFleet): FleetTabsVm | null {
  if (resolved.fleet.communityId === null) {
    return null;
  }

  return {
    communityId: resolved.fleet.communityId,
    fleetId: resolved.fleet.id,
    communitySlug: resolved.communitySlug,
    platformSegment: resolved.platformSegment,
    fleetSlug: resolved.fleet.slug,
    providesRoster: resolved.fleet.platformProvidesRosterExport,
    capabilities: resolved.viewer.capabilities,
    roles: resolved.viewer.roles,
  };
}

/**
 * The LCARS tab strip along the top of a Fleet's pages (FC-020).
 *
 * Every section is a route of its own, so a tab is a link: bookmarkable, and
 * honest to the back button. A tab is offered only to a reader who may use
 * it, as the Overview's actions are — a strip of sections somebody cannot
 * open tells them about permissions they did not ask about. Holdings are
 * public (FC-023), so every reader has that tab as well as the Overview, and
 * the strip is always drawn.
 */
@Component({
  selector: 'app-fleet-tabs',
  templateUrl: './fleet-tabs.component.html',
  styleUrls: ['./fleet-tabs.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class FleetTabsComponent {
  private readonly _reportService = inject(FleetReportService);

  /** The Fleet the strip sits on. */
  readonly vm = input.required<FleetTabsVm>();

  /**
   * Whether the reader may see any of the Fleet's reports.
   *
   * The server's answer, asked once per Fleet: which reports a reader is
   * shown depends on each report's audience as well as on who they are, and
   * a report can be public. A failed answer offers no tab, rather than one
   * leading to a page that cannot be read.
   */
  private readonly _hasReports = toSignal(
    toObservable(this.vm).pipe(
      switchMap(vm =>
        // Reports are counted from rosters, so a Fleet with none has none.
        vm.providesRoster
          ? this._reportService.visible(vm.communityId, vm.fleetId).pipe(
              map(reports => reports.length > 0),
              catchError(() => of(false)),
            )
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  /** The tabs the reader is offered, in strip order. */
  readonly tabs = computed<FleetTab[]>(() => {
    const {
      communitySlug,
      platformSegment,
      fleetSlug,
      providesRoster,
      capabilities,
      roles,
    } = this.vm();
    const tabs: FleetTab[] = [
      {
        link: FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug),
        label: 'Overview',
        // Every other tab's address starts with this one.
        exact: true,
      },
    ];

    // Its news (FC-027): on every registered Fleet, for whoever each post is
    // published to. Lit on a post, the editor and the drafts too.
    tabs.push({
      link: FLEET_LINKS.fleetNews(communitySlug, platformSegment, fleetSlug),
      label: 'News',
      exact: false,
    });

    // The private roster: the Fleet's members and up.
    if (providesRoster && capabilities.includes(ROSTER_VIEW_CAPABILITY)) {
      tabs.push({
        link: FLEET_LINKS.fleetRoster(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'Roster',
        exact: false,
      });
      tabs.push({
        link: FLEET_LINKS.fleetHistory(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'History',
        // Lit on a member's timeline beneath it too.
        exact: false,
      });
    }

    if (this._hasReports()) {
      tabs.push({
        link: FLEET_LINKS.fleetReports(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'Reports',
        exact: false,
      });
    }

    // A Fleet's holdings (FC-023): public, on every registered Fleet,
    // console ones included.
    tabs.push({
      link: FLEET_LINKS.fleetHoldings(
        communitySlug,
        platformSegment,
        fleetSlug,
      ),
      label: 'Holdings',
      exact: false,
    });

    if (
      providesRoster &&
      ROSTER_IMPORT_READERS.some(capability =>
        capabilities.includes(capability),
      )
    ) {
      tabs.push({
        link: FLEET_LINKS.fleetInvestigate(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'Investigate',
        // Lit on the imports, renames and conflicts beneath it too.
        exact: false,
      });
    }

    // Where officers run recruitment (FC-021): on every registered Fleet,
    // console ones included, for whoever holds any part of it.
    if (
      RECRUITMENT_TAB_CAPABILITIES.some(capability =>
        capabilities.includes(capability),
      )
    ) {
      tabs.push({
        link: FLEET_LINKS.fleetRecruitment(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'Recruitment',
        // Lit on the applications, invitations, members and settings too.
        exact: false,
      });
    }

    // Who governs the Fleet (FC-022): for its Owner, who changes it, and its
    // Admins, who may read it.
    if (roles.some(role => GOVERNANCE_READER_ROLES.includes(role))) {
      tabs.push({
        link: FLEET_LINKS.fleetManage(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        label: 'Manage',
        // Lit on its roles, delegation and history too.
        exact: false,
      });
    }

    return tabs;
  });
}
