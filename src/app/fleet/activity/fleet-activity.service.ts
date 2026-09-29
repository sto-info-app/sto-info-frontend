import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import { FleetActivityPage } from 'src/app/models/fleet-activity.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Activity feeds (FC-029): a Community's, a Fleet's or an Armada's, and the
 * signed-in person's own.
 *
 * A scope's feed goes with the access token when there is one and without it
 * when there is not; which items a reader is shown is the server's answer,
 * asked afresh each time. The personal feed needs the token.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetActivityService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a page of a scope's activity.
   *
   * @param target - The scope.
   * @param before - Where to carry on from, if anywhere.
   * @returns The page, newest first.
   */
  scopeFeed(
    target: GovernanceTarget,
    before: string | null = null,
  ): Observable<FleetActivityPage> {
    const community = `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}`;
    const url =
      target.fleetId !== null
        ? `${community}/fleets/${target.fleetId}/activity`
        : target.armadaId
          ? `${community}/armadas/${target.armadaId}/activity`
          : `${community}/activity`;

    return this._http.get<FleetActivityPage>(url, {
      ...(this._authService.getHttpOptionsWithAccessToken() ?? {}),
      params: this.paramsOf(before),
    });
  }

  /**
   * Reads a page of the signed-in person's own feed.
   *
   * @param before - Where to carry on from, if anywhere.
   * @returns The page, newest first.
   */
  mine(before: string | null = null): Observable<FleetActivityPage> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<FleetActivityPage>(
      `${API_URLS.FLEET_ACTIVITY}/mine`,
      { ...options, params: this.paramsOf(before) },
    );
  }

  /**
   * The query carrying a cursor, if there is one.
   *
   * @param before - The cursor.
   * @returns The parameters.
   */
  private paramsOf(before: string | null): HttpParams {
    return before === null
      ? new HttpParams()
      : new HttpParams().set('before', before);
  }
}
