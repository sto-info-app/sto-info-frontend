import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FLEET_AUDIENCE_LABELS,
  FLEET_SCOPE_COMMUNITY,
  SCOPE_CHILDREN_REGISTER_CAPABILITY,
} from 'src/app/fleet/constants/fleet-scope.constants';
import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
} from 'src/app/fleet/fleet-artwork';
import { scopeStatusPill } from 'src/app/fleet/fleet-card.builders';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { GOVERNANCE_READER_ROLES } from 'src/app/fleet/governance/governance.constants';
import { OwnershipOfferPanelVm } from 'src/app/fleet/governance/ownership-offer-panel/ownership-offer-panel.component';
import { buildScopeArtworkVm } from 'src/app/fleet/scope/fleet-scope-artwork.builder';
import { FLEET_SCOPE_LABELS } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetScopePageDirective } from 'src/app/fleet/scope/fleet-scope-page.directive';
import {
  FleetScopeAction,
  FleetScopeFact,
  FleetScopeReadyState,
} from 'src/app/fleet/scope/fleet-scope-page.models';
import { FleetScopeViewComponent } from 'src/app/fleet/scope/fleet-scope-view/fleet-scope-view.component';
import { FleetScopeRole } from 'src/app/models/fleet-governance.models';
import {
  FleetScopeStatus,
  ResolvedFleetCommunity,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * One Fleet Community's page.
 *
 * A Community is the only scope with a slug of its own and nothing above it,
 * so its address is one segment and its head names no parent.
 */
@Component({
  selector: 'app-community-page',
  templateUrl: './community-page.component.html',
  styleUrls: ['./community-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [AsyncPipe, FleetScopeViewComponent],
})
export class CommunityPageComponent extends FleetScopePageDirective<ResolvedFleetCommunity> {
  private readonly _scopes = inject(FleetScopeService);
  private readonly _authService = inject(AuthService);

  readonly missingMessage =
    'No Community answers to that address. It may have been closed, or the ' +
    'link may be out of date.';

  /**
   * Asks for the Community the address names.
   *
   * @param params - The address, in segments.
   * @returns The Community, and the retired segment when one was used.
   */
  protected resolve(params: ParamMap): Observable<ResolvedFleetCommunity> {
    return this._scopes.resolveCommunity(params.get('communitySlug') ?? '');
  }

  /**
   * Whether the segment the reader used has since been retired.
   *
   * @param resolved - The server's answer.
   * @returns True when the address should be replaced.
   */
  protected hasMoved(resolved: ResolvedFleetCommunity): boolean {
    return resolved.redirectedFrom !== null;
  }

  /**
   * Where this Community now lives.
   *
   * @param resolved - The server's answer.
   * @returns The router link.
   */
  protected canonicalLink(resolved: ResolvedFleetCommunity): string[] {
    return FLEET_LINKS.community(resolved.community.slug);
  }

  /**
   * What the reader may do here: register a Fleet or an Armada into the
   * Community, offered only to whoever the server says holds
   * `scope.children.register` here; and manage who governs it (FC-022),
   * offered to its Owner and Admins, and to a site administrator, who
   * settles disputes over its ownership from there.
   *
   * @param resolved - The server's answer.
   * @returns What to offer, which may be nothing.
   */
  private actionsFor(resolved: ResolvedFleetCommunity): FleetScopeAction[] {
    const { community, viewer } = resolved;
    const communityLink = FLEET_LINKS.community(community.slug);
    const actions: FleetScopeAction[] = [];

    if (viewer.capabilities.includes(SCOPE_CHILDREN_REGISTER_CAPABILITY)) {
      actions.push(
        {
          label: 'Register a Fleet here',
          link: [...communityLink, 'fleets', 'register'],
          description: `Register a Fleet into ${community.name}`,
        },
        {
          label: 'Register an Armada here',
          link: [...communityLink, 'armadas', 'register'],
          description: `Register an Armada into ${community.name}`,
        },
      );
    }

    if (
      viewer.roles.some(role => GOVERNANCE_READER_ROLES.includes(role)) ||
      this._authService.isLoggedInAsAdmin()
    ) {
      actions.push({
        label: 'Manage',
        link: FLEET_LINKS.communityManage(community.slug),
        description: `Manage who runs ${community.name}`,
      });
    }

    return actions;
  }

  /**
   * Where an offer of ownership is asked about: on an open Community the
   * reader is an Admin of, since only an Admin can be offered it.
   *
   * @param resolved - The server's answer.
   * @returns The panel's view model, or null.
   */
  private ownershipOfferFor(
    resolved: ResolvedFleetCommunity,
  ): OwnershipOfferPanelVm | null {
    const { community, viewer } = resolved;

    if (
      community.status !== FleetScopeStatus.ACTIVE ||
      !viewer.roles.includes(FleetScopeRole.ADMIN)
    ) {
      return null;
    }

    return {
      communityId: community.id,
      communityName: community.name,
      manageLink: FLEET_LINKS.communityManage(community.slug),
    };
  }

  /**
   * Turns the Community into what the page draws.
   *
   * @param resolved - The server's answer.
   * @returns The page's ready state.
   */
  protected present(resolved: ResolvedFleetCommunity): FleetScopeReadyState {
    const community = resolved.community;

    const facts: FleetScopeFact[] = [
      { label: 'Registered', value: this.formatInstant(community.createdAt) },
      {
        label: 'Visible to',
        value: FLEET_AUDIENCE_LABELS[community.visibility],
      },
      { label: 'Dates shown in', value: community.preferredTimezone },
    ];

    if (community.closedAt !== null) {
      facts.push({
        label: 'Closed',
        value: this.formatInstant(community.closedAt),
      });
    }

    return {
      kind: 'READY',
      actions: this.actionsFor(resolved),
      ownershipOffer: this.ownershipOfferFor(resolved),
      header: {
        scope: FLEET_SCOPE_COMMUNITY,
        name: community.name,
        // A Community spans every platform and sits inside nothing.
        platform: null,
        communityName: null,
        communityLink: null,
        banner: bannerOf(community),
        emblem: emblemOf(community, FLEET_EMBLEM_SIZES.PAGE),
        status: scopeStatusPill(community.status, community.recruitmentState),
        facts,
      },
      notice: null,
      following: {
        communityId: community.id,
        scopeNoun: FLEET_SCOPE_LABELS[FLEET_SCOPE_COMMUNITY],
        relationship: resolved.viewer.relationship,
        isFollowing: resolved.viewer.isFollowingCommunity,
        followerCount: resolved.viewer.followerCount,
      },
      description: community.description,
      artwork: buildScopeArtworkVm(
        { kind: 'COMMUNITY', communityId: community.id },
        community.name,
        community,
        resolved.viewer,
      ),
    };
  }
}
