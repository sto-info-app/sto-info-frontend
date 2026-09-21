import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Observable } from 'rxjs';

import {
  FLEET_AUDIENCE_LABELS,
  FLEET_SCOPE_FLEET,
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
import { ResolvedStoFleet } from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * One Fleet's page, below the Community that registered it.
 *
 * Both the Community and the platform are part of the address because both
 * are part of the Fleet's identity: the same name exists separately on each
 * platform, and two Communities may each hold a record of it.
 *
 * How fresh the record is leads the facts. Anybody may register a Fleet here
 * and nothing proves they run it, so when a roster was last imported is the
 * strongest thing a reader has for telling a kept record from an abandoned
 * one.
 */
@Component({
  selector: 'app-fleet-page',
  templateUrl: './fleet-page.component.html',
  styleUrls: ['./fleet-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [AsyncPipe, FleetScopeViewComponent],
})
export class FleetPageComponent extends FleetScopePageDirective<ResolvedStoFleet> {
  private readonly _scopes = inject(FleetScopeService);

  readonly missingMessage =
    'No Fleet answers to that address under that Community. It may have ' +
    'been closed, or the link may be out of date.';

  /**
   * Asks for the Fleet the address names.
   *
   * @param params - The address, in segments.
   * @returns The Fleet, and the current form of every segment.
   */
  protected resolve(params: ParamMap): Observable<ResolvedStoFleet> {
    return this._scopes.resolveFleet(
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
  protected hasMoved(resolved: ResolvedStoFleet): boolean {
    return resolved.redirected;
  }

  /**
   * Where this Fleet now lives.
   *
   * @param resolved - The server's answer.
   * @returns The router link.
   */
  protected canonicalLink(resolved: ResolvedStoFleet): string[] {
    return FLEET_LINKS.fleet(
      resolved.communitySlug,
      resolved.platformSegment,
      resolved.fleet.slug,
    );
  }

  /**
   * Turns the Fleet into what the page draws.
   *
   * @param resolved - The server's answer.
   * @returns The page's ready state.
   */
  protected present(resolved: ResolvedStoFleet): FleetScopeReadyState {
    const fleet = resolved.fleet;

    const facts: FleetScopeFact[] = [
      {
        label: 'Roster last imported',
        value:
          fleet.lastEffectiveImportAt === null
            ? 'Never'
            : this.formatInstant(fleet.lastEffectiveImportAt),
      },
      { label: 'Platform', value: fleet.platformName },
      { label: 'Registered', value: this.formatInstant(fleet.createdAt) },
      { label: 'Visible to', value: FLEET_AUDIENCE_LABELS[fleet.visibility] },
    ];

    if (fleet.closedAt !== null) {
      facts.push({
        label: 'Closed',
        value: this.formatInstant(fleet.closedAt),
      });
    }

    return {
      kind: 'READY',
      header: {
        scope: FLEET_SCOPE_FLEET,
        name: fleet.exactGameName,
        platform: fleet.platformName,
        communityName: resolved.communityName,
        communityLink: FLEET_LINKS.community(resolved.communitySlug),
        banner: bannerOf(fleet),
        emblem: emblemOf(fleet, FLEET_EMBLEM_SIZES.PAGE),
        status: scopeStatusPill(fleet.status, fleet.recruitmentState),
        facts,
      },
      // A Fleet has no description of its own; what a Community writes about
      // it belongs to the Community.
      description: null,
    };
  }
}
