import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ResolvedFleetCommunity,
  ResolvedStoArmada,
  ResolvedStoFleet,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Where every canonical address is resolved from. */
const BY_SLUG = `${API_URLS.FLEET_COMMUNITIES}/by-slug`;

/**
 * Reads one Community, Fleet or Armada from its canonical address.
 *
 * A whole address is resolved in one request. Fetching the Community, then
 * the platform, then the Fleet would show three loading states for one page
 * and would leave the page inventing an answer when the second call
 * disagreed with the first.
 *
 * The answer is a `200` carrying the current segments even when the address
 * asked for is an out-of-date one — never a `301`, which the browser would
 * have followed before this application could see it, leaving the history
 * stack holding an address nobody chose (ADR-0022).
 *
 * The viewer's token is attached when there is one. Unlike the three
 * directory listings, what a single scope answers does depend on who is
 * asking: a Community that is not public is readable by its own people and
 * absent to everybody else.
 */
@Injectable({ providedIn: 'root' })
export class FleetScopeService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Resolves a Community from its URL segment.
   *
   * @param communitySlug - The segment the reader arrived on.
   * @returns The Community, and the retired segment when one was used.
   */
  resolveCommunity(communitySlug: string): Observable<ResolvedFleetCommunity> {
    return this._http.get<ResolvedFleetCommunity>(
      `${BY_SLUG}/${encodeURIComponent(communitySlug)}`,
      this.viewerOptions(),
    );
  }

  /**
   * Resolves a Fleet from its canonical address.
   *
   * @param communitySlug - The holding Community's segment.
   * @param platformSegment - The platform's segment.
   * @param fleetSlug - The Fleet's segment.
   * @returns The Fleet, and the current form of every segment.
   */
  resolveFleet(
    communitySlug: string,
    platformSegment: string,
    fleetSlug: string,
  ): Observable<ResolvedStoFleet> {
    return this._http.get<ResolvedStoFleet>(
      `${BY_SLUG}/${encodeURIComponent(communitySlug)}/fleets/` +
        `${encodeURIComponent(platformSegment)}/${encodeURIComponent(fleetSlug)}`,
      this.viewerOptions(),
    );
  }

  /**
   * Resolves an Armada from its canonical address.
   *
   * @param communitySlug - The holding Community's segment.
   * @param platformSegment - The platform's segment.
   * @param armadaSlug - The Armada's segment.
   * @returns The Armada, and the current form of every segment.
   */
  resolveArmada(
    communitySlug: string,
    platformSegment: string,
    armadaSlug: string,
  ): Observable<ResolvedStoArmada> {
    return this._http.get<ResolvedStoArmada>(
      `${BY_SLUG}/${encodeURIComponent(communitySlug)}/armadas/` +
        `${encodeURIComponent(platformSegment)}/${encodeURIComponent(armadaSlug)}`,
      this.viewerOptions(),
    );
  }

  /**
   * The request options carrying the viewer's access token, if they have one.
   *
   * @returns The auth headers when signed in, otherwise an empty options bag.
   */
  private viewerOptions(): Record<string, unknown> {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }
}
