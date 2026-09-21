import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Observable } from 'rxjs';

import {
  FLEET_AUDIENCE_LABELS,
  FLEET_SCOPE_COMMUNITY,
} from 'src/app/fleet/constants/fleet-scope.constants';
import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
} from 'src/app/fleet/fleet-artwork';
import { scopeStatusPill } from 'src/app/fleet/fleet-card.builders';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { FleetScopePageDirective } from 'src/app/fleet/scope/fleet-scope-page.directive';
import {
  FleetScopeFact,
  FleetScopeReadyState,
} from 'src/app/fleet/scope/fleet-scope-page.models';
import { FleetScopeViewComponent } from 'src/app/fleet/scope/fleet-scope-view/fleet-scope-view.component';
import { ResolvedFleetCommunity } from 'src/app/models/fleet.models';
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
      description: community.description,
    };
  }
}
