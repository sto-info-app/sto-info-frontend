import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { ROSTER_IMPORT_READERS } from 'src/app/fleet/imports/roster-import.constants';
import { ROSTER_VIEW_CAPABILITY } from 'src/app/fleet/roster/roster.constants';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

/** What the strip needs to know about the Fleet it sits on. */
export interface FleetTabsVm {
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly fleetSlug: string;
  /** What the reader may do here, which decides the tabs they are offered. */
  readonly capabilities: readonly string[];
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
 * @returns The strip's view model, or null for a Fleet with no roster to
 *   have sections about: one no Community holds, which nobody imports into,
 *   and one on a platform the game writes no roster export on.
 */
export function fleetTabsVmOf(resolved: ResolvedStoFleet): FleetTabsVm | null {
  if (
    resolved.fleet.communityId === null ||
    !resolved.fleet.platformProvidesRosterExport
  ) {
    return null;
  }

  return {
    communitySlug: resolved.communitySlug,
    platformSegment: resolved.platformSegment,
    fleetSlug: resolved.fleet.slug,
    capabilities: resolved.viewer.capabilities,
  };
}

/**
 * The LCARS tab strip along the top of a Fleet's pages (FC-020).
 *
 * Every section is a route of its own, so a tab is a link: bookmarkable, and
 * honest to the back button. A tab is offered only to a reader who may use
 * it, as the Overview's actions are — a strip of sections somebody cannot
 * open tells them about permissions they did not ask about.
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
  /** The Fleet the strip sits on. */
  readonly vm = input.required<FleetTabsVm>();

  /** The tabs the reader is offered, in strip order. */
  readonly tabs = computed<FleetTab[]>(() => {
    const { communitySlug, platformSegment, fleetSlug, capabilities } =
      this.vm();
    const tabs: FleetTab[] = [
      {
        link: FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug),
        label: 'Overview',
        // Every other tab's address starts with this one.
        exact: true,
      },
    ];

    // The private roster: the Fleet's members and up.
    if (capabilities.includes(ROSTER_VIEW_CAPABILITY)) {
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

    if (
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

    return tabs;
  });
}
