import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Observable, of } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  APPLICATIONS_VIEW_CAPABILITY,
  MEMBERS_MANAGE_CAPABILITY,
  RECRUITMENT_MANAGE_CAPABILITY,
  RECRUITMENT_TAB_CAPABILITIES,
} from 'src/app/fleet/recruitment/recruitment.constants';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import { FleetScopeAction } from 'src/app/fleet/scope/fleet-scope-page.models';

/** What to say to somebody with no part in the Fleet's recruitment. */
export const FLEET_RECRUITMENT_NOT_PERMITTED =
  'Running this Fleet’s recruitment is not something your account may do.';

/**
 * Where a Fleet's officers run its recruitment (FC-021).
 *
 * A hub, as Investigate is: each part is a page of its own, and each is
 * offered only to whoever holds its capability. Reading applications and
 * invitations takes `applications.view`; the members list takes
 * `members.manage`; how the Fleet recruits takes `recruitment.manage`.
 */
@Component({
  selector: 'app-fleet-recruitment-hub',
  templateUrl: './fleet-recruitment-hub.component.html',
  styleUrls: ['./fleet-recruitment-hub.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, FleetPageShellComponent, FleetTabsComponent],
})
export class FleetRecruitmentHubComponent extends FleetSectionPageDirective<
  FleetScopeAction[]
> {
  readonly notPermittedMessage = FLEET_RECRUITMENT_NOT_PERMITTED;

  protected readonly _requiredCapabilities = RECRUITMENT_TAB_CAPABILITIES;

  protected override readonly _needsRoster = false;

  /**
   * Works out what the reader may go and do.
   *
   * @param section - The Fleet.
   * @returns The pages they may open, in the order they are offered.
   */
  protected load(section: FleetSection): Observable<FleetScopeAction[]> {
    const { communitySlug, platformSegment, fleetSlug, capabilities } =
      section.tabs;
    const name = section.fleetName;
    const actions: FleetScopeAction[] = [];

    if (capabilities.includes(APPLICATIONS_VIEW_CAPABILITY)) {
      actions.push({
        label: 'Applications',
        link: FLEET_LINKS.fleetApplications(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description: `Read the applications to ${name}, and decide those waiting.`,
      });
      actions.push({
        label: 'Invitations',
        link: FLEET_LINKS.fleetInvitations(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description: `See who has been invited to ${name}, and invite somebody.`,
      });
    }

    if (capabilities.includes(MEMBERS_MANAGE_CAPABILITY)) {
      actions.push({
        label: 'Members',
        link: FLEET_LINKS.fleetMembers(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description: `See ${name}’s members here, and remove one.`,
      });
    }

    if (capabilities.includes(RECRUITMENT_MANAGE_CAPABILITY)) {
      actions.push({
        label: 'Settings',
        link: FLEET_LINKS.fleetRecruitmentSettings(
          communitySlug,
          platformSegment,
          fleetSlug,
        ),
        description:
          `Choose how ${name} recruits: its state, requirements and ` +
          'application form.',
      });
    }

    return of(actions);
  }
}
