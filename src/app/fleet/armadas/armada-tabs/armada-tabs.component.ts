import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { map } from 'rxjs';

import { ARMADA_MANAGE_CAPABILITY } from 'src/app/fleet/armadas/armada.constants';
import { FleetTab } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { CHAT_POST_CAPABILITY } from 'src/app/fleet/chat/chat.text';
import { GOVERNANCE_READER_ROLES } from 'src/app/fleet/governance/governance.constants';
import { ResolvedStoArmada } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

/** What the Armada tab strip needs to know. */
export interface ArmadaTabsVm {
  /** The Armada, for the way into its chat (FC-033). */
  readonly armadaId: string;
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
    armadaId: resolved.armada.id,
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

  /** Whether chat is switched on (FC-033). */
  private readonly _chatOffered = toSignal(
    inject(FleetConfigurationService)
      .getFeatures()
      .pipe(map(features => features.chatEnabled)),
    { initialValue: false },
  );

  /** The tabs the reader is offered, in strip order. */
  readonly tabs = computed<FleetTab[]>(() => {
    const {
      armadaId,
      communitySlug,
      platformSegment,
      armadaSlug,
      capabilities,
      roles,
    } = this.vm();
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
      // Its activity (FC-029).
      {
        link: FLEET_LINKS.armadaActivity(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'Activity',
        exact: false,
      },
      // Its events (FC-030).
      {
        link: FLEET_LINKS.armadaEvents(
          communitySlug,
          platformSegment,
          armadaSlug,
        ),
        label: 'Events',
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

    // Its chat (FC-033): a door out to the chat page, so last, for whoever
    // takes part in it while chat is on.
    if (
      this._chatOffered() &&
      (capabilities.includes(CHAT_POST_CAPABILITY) || roles.length > 0)
    ) {
      tabs.push({
        link: ['/chat', 'armadas', armadaId],
        label: 'Chat',
        exact: true,
      });
    }

    return tabs;
  });
}
