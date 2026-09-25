import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Observable, of } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  ROSTER_IMPORT_CAPABILITY,
  ROSTER_IMPORT_READERS,
  ROSTER_INVESTIGATE_CAPABILITY,
} from 'src/app/fleet/imports/roster-import.constants';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import { FleetScopeAction } from 'src/app/fleet/scope/fleet-scope-page.models';

/** What to say to somebody who neither imports nor investigates here. */
export const FLEET_INVESTIGATE_NOT_PERMITTED =
  'Looking into this Fleet’s rosters is not something your account may do.';

/**
 * Where a Fleet's roster is looked into (FC-020).
 *
 * For whoever imports the Fleet's rosters or investigates them — neither
 * implies the other — and offering each only what they may do: an importer
 * sends exports and follows them, an investigator decides renames, settles
 * conflicts and orders the ranks.
 */
@Component({
  selector: 'app-fleet-investigate',
  templateUrl: './fleet-investigate.component.html',
  styleUrls: ['./fleet-investigate.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, FleetPageShellComponent, FleetTabsComponent],
})
export class FleetInvestigateComponent extends FleetSectionPageDirective<
  FleetScopeAction[]
> {
  readonly notPermittedMessage = FLEET_INVESTIGATE_NOT_PERMITTED;

  protected readonly _requiredCapabilities = ROSTER_IMPORT_READERS;

  /**
   * Works out what the reader may go and do.
   *
   * @param section - The Fleet.
   * @returns The pages they may open, in the order they are offered.
   */
  protected load(section: FleetSection): Observable<FleetScopeAction[]> {
    const { communitySlug, platformSegment, fleetSlug, capabilities } =
      section.tabs;
    const { fleet } = section.resolved;
    const actions: FleetScopeAction[] = [];

    // A Fleet on a platform with no roster export has no sections, so never
    // reaches here to be offered an upload it could not use.
    if (capabilities.includes(ROSTER_IMPORT_CAPABILITY)) {
      actions.push({
        label: 'Import a roster export',
        link: FLEET_LINKS.fleetRosterImportForm(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description: `Check a roster export for ${fleet.exactGameName}, and then import it.`,
      });
    }

    actions.push({
      label: 'Roster imports',
      link: FLEET_LINKS.fleetRosterImports(
        communitySlug,
        platformSegment,
        fleetSlug,
      ),
      description: `See what became of each roster export imported into ${fleet.exactGameName}.`,
    });

    // Deciding renames is investigating, and only that capability's.
    if (capabilities.includes(ROSTER_INVESTIGATE_CAPABILITY)) {
      actions.push({
        label: 'Conflicting exports',
        link: FLEET_LINKS.fleetRosterConflicts(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description:
          `Choose which of ${fleet.exactGameName}’s exports stands for a ` +
          'moment two or more of them claim.',
      });
      actions.push({
        label: 'Roster identities',
        link: FLEET_LINKS.fleetRosterIdentities(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description:
          `Decide the renames ${fleet.exactGameName}’s rosters suggest from ` +
          'one export to the next.',
      });
      actions.push({
        label: 'Rank order',
        link: FLEET_LINKS.fleetRankOrder(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description:
          `Order ${fleet.exactGameName}’s ranks, so a move between two reads ` +
          'as a promotion or a demotion.',
      });
    }

    return of(actions);
  }
}
