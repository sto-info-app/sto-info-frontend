import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  DecideRosterIdentityCandidate,
  RosterIdentityCandidate,
  RosterIdentityCandidatePage,
  RosterIdentityCandidateState,
} from 'src/app/models/fleet-identity.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading a Fleet's rename candidates, and deciding them.
 *
 * A decision changes nothing but the candidate. The server works the Fleet's
 * identities out again afterwards, on a queue, so what a confirmed rename
 * joins is settled a moment after the answer rather than in it.
 */
@Injectable({
  providedIn: 'root',
})
export class RosterIdentityService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a page of a Fleet's candidates, open ones first.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param page - The page, from 1.
   * @param state - Only candidates in this state, or null for every one.
   * @returns An observable of the page.
   */
  list(
    communityId: string,
    fleetId: string,
    page: number,
    state: RosterIdentityCandidateState | null,
  ): Observable<RosterIdentityCandidatePage> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    let params = new HttpParams().set('page', String(page));

    if (state !== null) {
      params = params.set('state', state);
    }

    return this._http.get<RosterIdentityCandidatePage>(
      `${this.identitiesUrl(communityId, fleetId)}/candidates`,
      { ...httpOptions, params },
    );
  }

  /**
   * Confirms, rejects or undoes a candidate.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param candidateId - The candidate.
   * @param decision - What to do, the revision it was loaded at, and why.
   * @returns An observable of the candidate as it now stands.
   */
  decide(
    communityId: string,
    fleetId: string,
    candidateId: string,
    decision: DecideRosterIdentityCandidate,
  ): Observable<RosterIdentityCandidate> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<RosterIdentityCandidate>(
      `${this.identitiesUrl(communityId, fleetId)}/candidates/${candidateId}/decisions`,
      decision,
      httpOptions,
    );
  }

  /**
   * Where a Fleet's identities live.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The URL, without a trailing slash.
   */
  private identitiesUrl(communityId: string, fleetId: string): string {
    return (
      `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
      '/roster-identities'
    );
  }
}
