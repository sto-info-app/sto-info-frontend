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
 * What a reader is told about a Fleet no Community here has registered.
 *
 * Worth saying plainly rather than leaving them to infer it from a missing
 * line. The record looks like every other Fleet, and the two things that
 * make it different — nobody stands behind it, and nobody can correct it —
 * are exactly the two a reader would otherwise assume the opposite of.
 */
const STANDALONE_NOTICE =
  'No Community here has registered this Fleet. The record exists so an ' +
  'imported roster has something to attach to, and so anybody looking for ' +
  'the Fleet finds this rather than confirming a second one. Nobody owns ' +
  'it, so nobody can change or close it.';

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
 *
 * A Fleet with no Community reaches the same page by the same route: the
 * reserved segment `standalone` sits where a Community's slug would, and
 * the answer says so by naming no Community. The page keeps one shape and
 * adds a notice, because what differs is what the record *is* rather than
 * how it is drawn.
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
    const isStandalone = resolved.communityName === null;

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
        // Nothing to open where there is no Community. The header draws the
        // line naming one only when there is one to name.
        communityLink: isStandalone
          ? null
          : FLEET_LINKS.community(resolved.communitySlug),
        banner: bannerOf(fleet),
        emblem: emblemOf(fleet, FLEET_EMBLEM_SIZES.PAGE),
        status: scopeStatusPill(fleet.status, fleet.recruitmentState),
        facts,
      },
      notice: isStandalone ? STANDALONE_NOTICE : null,
      // A Fleet has no description of its own; what a Community writes about
      // it belongs to the Community.
      description: null,
    };
  }
}
