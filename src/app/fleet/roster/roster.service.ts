import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RosterChangeKind,
  RosterHistoryPage,
  RosterPage,
  RosterQuery,
  RosterRankOrder,
  RosterTimeline,
  UpdateRosterRankOrder,
} from 'src/app/models/fleet-roster.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading a Fleet's roster, its history and one member's, and its rank
 * order (FC-020).
 *
 * All of it is the private roster, for the Fleet's members and up, so every
 * request is signed. The server decides who may read what; a request made
 * without a token is refused here rather than sent to be refused there.
 */
@Injectable({
  providedIn: 'root',
})
export class RosterService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a page of the roster as one export listed it.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param query - The export, page, ordering and filters.
   * @returns An observable of the page.
   */
  roster(
    communityId: string,
    fleetId: string,
    query: RosterQuery,
  ): Observable<RosterPage> {
    return this.get<RosterPage>(
      this.rosterUrl(communityId, fleetId),
      paramsOf({ ...query }),
    );
  }

  /**
   * Reads a page of the history, newest interval first.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param page - The page, from 1.
   * @param kinds - Only these kinds of change, or every kind when empty.
   * @returns An observable of the page.
   */
  history(
    communityId: string,
    fleetId: string,
    page: number,
    kinds: readonly RosterChangeKind[],
  ): Observable<RosterHistoryPage> {
    return this.get<RosterHistoryPage>(
      `${this.rosterUrl(communityId, fleetId)}/history`,
      paramsOf({ page, kinds: kinds.length > 0 ? kinds.join(',') : undefined }),
    );
  }

  /**
   * Reads one member's history.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param identityId - The member.
   * @returns An observable of their timeline.
   */
  timeline(
    communityId: string,
    fleetId: string,
    identityId: string,
  ): Observable<RosterTimeline> {
    return this.get<RosterTimeline>(
      `${this.rosterUrl(communityId, fleetId)}/members/${identityId}`,
      new HttpParams(),
    );
  }

  /**
   * Reads the Fleet's rank order.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the order.
   */
  rankOrder(communityId: string, fleetId: string): Observable<RosterRankOrder> {
    return this.get<RosterRankOrder>(
      `${this.rosterUrl(communityId, fleetId)}/rank-order`,
      new HttpParams(),
    );
  }

  /**
   * Replaces the Fleet's rank order, with a reason.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param edit - The new order, the order as loaded, and why.
   * @returns An observable of the order as it now stands.
   */
  updateRankOrder(
    communityId: string,
    fleetId: string,
    edit: UpdateRosterRankOrder,
  ): Observable<RosterRankOrder> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.put<RosterRankOrder>(
      `${this.rosterUrl(communityId, fleetId)}/rank-order`,
      edit,
      httpOptions,
    );
  }

  /**
   * Makes a signed GET.
   *
   * @param url - Where.
   * @param params - The query.
   * @returns An observable of the answer.
   */
  private get<T>(url: string, params: HttpParams): Observable<T> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<T>(url, { ...httpOptions, params });
  }

  /**
   * Where a Fleet's roster lives.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The URL, without a trailing slash.
   */
  private rosterUrl(communityId: string, fleetId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}/roster`;
  }
}

/**
 * Builds query parameters, leaving out whatever was not given.
 *
 * @param values - The parameters.
 * @returns The query.
 */
export function paramsOf(
  values: Record<string, string | number | undefined>,
): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }

  return params;
}
