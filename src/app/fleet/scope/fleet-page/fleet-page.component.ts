import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { Observable } from 'rxjs';

import {
  FLEET_AUDIENCE_LABELS,
  FLEET_SCOPE_FLEET,
  FLEET_SCOPE_LABELS,
} from 'src/app/fleet/constants/fleet-scope.constants';
import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
} from 'src/app/fleet/fleet-artwork';
import { scopeStatusPill } from 'src/app/fleet/fleet-card.builders';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { ROSTER_IMPORT_CAPABILITY } from 'src/app/fleet/imports/roster-import.constants';
import { buildScopeArtworkVm } from 'src/app/fleet/scope/fleet-scope-artwork.builder';
import { FleetScopePageDirective } from 'src/app/fleet/scope/fleet-scope-page.directive';
import {
  FleetScopeAction,
  FleetScopeFact,
  FleetScopeReadyState,
} from 'src/app/fleet/scope/fleet-scope-page.models';
import { FleetScopeViewComponent } from 'src/app/fleet/scope/fleet-scope-view/fleet-scope-view.component';
import { ResolvedStoFleet, StoFleet } from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * What a reader is told about a Fleet no Community here has registered.
 *
 * Worth saying plainly rather than leaving them to infer it from a missing
 * line. The record looks like every other Fleet, and the two things that
 * make it different — nobody stands behind it, and nobody can correct it —
 * are exactly the two a reader would otherwise assume the opposite of.
 */
/**
 * What stands where the import date would, on a platform the game exports no
 * roster from.
 *
 * The date line is the strongest thing a reader has for telling a kept record
 * from an abandoned one, which is exactly why “Never” is the wrong thing to
 * say to somebody looking at a console Fleet: nobody there has ever been
 * given a file to import, and a record that could not possibly have one reads
 * as a record nobody is keeping. Naming the platform matters because the
 * reader may be the Fleet leader who has spent ten minutes looking for the
 * menu.
 *
 * @param platformName - The platform, as the catalogue names it.
 * @returns What the line says instead of a date.
 */
function rosterUnavailableOn(platformName: string): string {
  return `The game provides no roster export on ${platformName}`;
}

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
   * What the record says about its roster.
   *
   * Three answers rather than two. A Fleet that has never imported one and a
   * Fleet that never could look identical on the line that matters most for
   * judging a record, and the second is not somebody's neglect.
   *
   * @param fleet - The Fleet being drawn.
   * @returns The line beneath “Roster last imported”.
   */
  private rosterFreshness(fleet: StoFleet): string {
    if (!fleet.platformProvidesRosterExport) {
      return rosterUnavailableOn(fleet.platformName);
    }

    return fleet.lastEffectiveImportAt === null
      ? 'Never'
      : this.formatInstant(fleet.lastEffectiveImportAt);
  }

  /**
   * What the reader may go and do to this Fleet.
   *
   * One thing so far, and three reasons there may be none. A Fleet nobody
   * has registered has no Community to import into; a console Fleet has no
   * export to import, because the game writes none there; and anybody may
   * read this page, so the control appears only for somebody who could use
   * it. The page behind it explains all three anyway, for whoever arrives by
   * link — but a Fleet page is mostly read by people with no business
   * importing anything, and offering them a control is telling them about a
   * permission they did not ask about.
   *
   * @param resolved - The server's answer.
   * @returns What to offer, which may be nothing.
   */
  private actionsFor(resolved: ResolvedStoFleet): FleetScopeAction[] {
    const { fleet, viewer } = resolved;

    if (
      fleet.communityId === null ||
      !fleet.platformProvidesRosterExport ||
      !viewer.capabilities.includes(ROSTER_IMPORT_CAPABILITY)
    ) {
      return [];
    }

    return [
      {
        label: 'Import a roster export',
        link: FLEET_LINKS.fleetRosterImportForm(
          resolved.communitySlug,
          resolved.platformSegment,
          fleet.slug,
        ),
        description:
          `Check a roster export for ${fleet.exactGameName}, and then ` +
          'import it',
      },
    ];
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
        value: this.rosterFreshness(fleet),
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
      actions: this.actionsFor(resolved),
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
      // Following is of the Community that holds the Fleet, because that is
      // where the subscription lives. A Fleet nobody has registered has
      // none, and the control says so rather than offering nothing.
      following: {
        communityId: fleet.communityId,
        scopeNoun: FLEET_SCOPE_LABELS[FLEET_SCOPE_FLEET],
        relationship: resolved.viewer.relationship,
        isFollowing: resolved.viewer.isFollowingCommunity,
        followerCount: resolved.viewer.followerCount,
      },
      // A Fleet has no description of its own; what a Community writes about
      // it belongs to the Community.
      description: null,
      // Two addresses, because there are two rules. A registered Fleet's
      // artwork is a capability held at it; an unregistered one's is a
      // question about who filled the slot, answered a slot at a time.
      artwork: buildScopeArtworkVm(
        isStandalone || fleet.communityId === null
          ? { kind: 'STANDALONE_FLEET', fleetId: fleet.id }
          : {
              kind: 'FLEET',
              communityId: fleet.communityId,
              fleetId: fleet.id,
            },
        fleet.exactGameName,
        fleet,
        resolved.viewer,
      ),
    };
  }
}
