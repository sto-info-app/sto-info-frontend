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
    communityId: resolved.fleet.communityId,
    fleetId: resolved.fleet.id,
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
        this._reportService.visible(vm.communityId, vm.fleetId).pipe(
          map(reports => reports.length > 0),
          catchError(() => of(false)),
        ),
      ),
    ),
    { initialValue: false },
  );

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
