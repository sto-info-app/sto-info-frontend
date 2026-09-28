import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ARMADA_MANAGE_CAPABILITY } from 'src/app/fleet/armadas/armada.constants';
import { FleetTab } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { GOVERNANCE_READER_ROLES } from 'src/app/fleet/governance/governance.constants';
import { ResolvedStoArmada } from 'src/app/models/fleet.models';

/** What the Armada tab strip needs to know. */
export interface ArmadaTabsVm {
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly armadaSlug: string;
  /** What the reader may do here, which decides the Requests tab. */
  readonly capabilities: readonly string[];
  /** The role labels the reader holds here, which decide the Manage tab. */
  readonly roles: readonly string[];
}

/**
 * Works out the strip for a resolved Armada.
 *
 * @param resolved - The Armada, as the server resolved it.
 * @returns The strip's view model.
 */
export function armadaTabsVmOf(resolved: ResolvedStoArmada): ArmadaTabsVm {
  return {
    communitySlug: resolved.communitySlug,
    platformSegment: resolved.platformSegment,
    armadaSlug: resolved.armada.slug,
    capabilities: resolved.viewer.capabilities,
    roles: resolved.viewer.roles,
  };
}

/**
 * The LCARS tab strip along the top of an Armada's pages (FC-026).
 *
 * The Overview, with the tree, and its History for anybody who may see it;
 * Requests for `armada.manage` holders; Manage for its Owner and Admins. A
 * tab is offered only to a reader who may use it, as the Fleet's are.
 */
@Component({
  selector: 'app-armada-tabs',
  templateUrl: './armada-tabs.component.html',
  styleUrls: ['./armada-tabs.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class ArmadaTabsComponent {
  /** The Armada the strip sits on. */
  readonly vm = input.required<ArmadaTabsVm>();

  /** The tabs the reader is offered, in strip order. */
  readonly tabs = computed<FleetTab[]>(() => {
    const { communitySlug, platformSegment, armadaSlug, capabilities, roles } =
      this.vm();
    const tabs: FleetTab[] = [
      {
        link: FLEET_LINKS.armada(communitySlug, platformSegment, armadaSlug),
        label: 'Overview',
        exact: true,
      },
      // Its news (FC-027): for whoever each post is published to, and lit
      // on a post, the editor and the drafts beneath it too.
      {
        link: FLEET_LINKS.armadaNews(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'News',
        exact: false,
      },
      {
        link: FLEET_LINKS.armadaHistory(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'History',
        exact: false,
      },
    ];

    if (capabilities.includes(ARMADA_MANAGE_CAPABILITY)) {
      tabs.push({
        link: FLEET_LINKS.armadaRequests(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'Requests',
        exact: false,
      });
    }

    if (roles.some(role => GOVERNANCE_READER_ROLES.includes(role))) {
      tabs.push({
        link: FLEET_LINKS.armadaManage(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'Manage',
        // Lit on its roles, delegation and history too.
        exact: false,
      });
    }

    return tabs;
  });
}
