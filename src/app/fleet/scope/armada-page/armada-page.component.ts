import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Observable } from 'rxjs';

import { FLEET_SCOPE_ARMADA } from 'src/app/fleet/constants/fleet-scope.constants';
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
import { ResolvedStoArmada } from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * One Armada's page, below the Community that registered it.
 *
 * No visibility fact and no recruitment pill: an Armada has neither. It is
 * seen exactly as far as the Community holding it, and it groups Fleets
 * rather than recruiting players.
 *
 * Which Fleets are in it is not here either. Membership is a temporal
 * record with its own route, so a Fleet can leave without this page's shape
 * changing at all — it arrives with the ticket that builds it.
 */
@Component({
  selector: 'app-armada-page',
  templateUrl: './armada-page.component.html',
  styleUrls: ['./armada-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [AsyncPipe, FleetScopeViewComponent],
})
export class ArmadaPageComponent extends FleetScopePageDirective<ResolvedStoArmada> {
  private readonly _scopes = inject(FleetScopeService);

  readonly missingMessage =
    'No Armada answers to that address under that Community. It may have ' +
    'been closed, or the link may be out of date.';

  /**
   * Asks for the Armada the address names.
   *
   * @param params - The address, in segments.
   * @returns The Armada, and the current form of every segment.
   */
  protected resolve(params: ParamMap): Observable<ResolvedStoArmada> {
    return this._scopes.resolveArmada(
      params.get('communitySlug') ?? '',
      params.get('platformSegment') ?? '',
      params.get('slug') ?? '',
    );
  }

  /**
   * Whether any segment the reader used has since been retired.
   *
   * @param resolved - The server's answer.
   * @returns True when the address should be replaced.
   */
  protected hasMoved(resolved: ResolvedStoArmada): boolean {
    return resolved.redirected;
  }

  /**
   * Where this Armada now lives.
   *
   * @param resolved - The server's answer.
   * @returns The router link.
   */
  protected canonicalLink(resolved: ResolvedStoArmada): string[] {
    return FLEET_LINKS.armada(
      resolved.communitySlug,
      resolved.platformSegment,
      resolved.armada.slug,
    );
  }

  /**
   * Turns the Armada into what the page draws.
   *
   * @param resolved - The server's answer.
   * @returns The page's ready state.
   */
  protected present(resolved: ResolvedStoArmada): FleetScopeReadyState {
    const armada = resolved.armada;

    const facts: FleetScopeFact[] = [
      { label: 'Platform', value: armada.platformName },
      { label: 'Registered', value: this.formatInstant(armada.createdAt) },
    ];

    // The exact game name is the heading, so a Community that prefers to
    // call it something else gets its preference here, where it cannot be
    // mistaken for the name the game holds.
    if (
      armada.displayName !== null &&
      armada.displayName !== armada.exactGameName
    ) {
      facts.unshift({ label: 'Known as', value: armada.displayName });
    }

    if (armada.closedAt !== null) {
      facts.push({
        label: 'Closed',
        value: this.formatInstant(armada.closedAt),
      });
    }

    return {
      kind: 'READY',
      header: {
        scope: FLEET_SCOPE_ARMADA,
        name: armada.exactGameName,
        platform: armada.platformName,
        communityName: resolved.communityName,
        communityLink: FLEET_LINKS.community(resolved.communitySlug),
        banner: bannerOf(armada),
        emblem: emblemOf(armada, FLEET_EMBLEM_SIZES.PAGE),
        // An Armada recruits nobody, so the pill speaks only when the
        // record itself has stopped operating.
        status: scopeStatusPill(armada.status, null),
        facts,
      },
      description: null,
    };
  }
}
