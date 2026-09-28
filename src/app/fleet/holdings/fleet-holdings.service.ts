import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FleetHoldingHistoryPage,
  FleetHoldings,
  RecordFleetHoldingRequest,
} from 'src/app/models/fleet-holdings.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The tiers of a Fleet's holdings, and how they changed (FC-023).
 *
 * Reading works signed out, since holdings are public; the access token is
 * sent when there is one, so a recorder learns they may record and a member
 * sees who recorded each change. Recording needs it, and is refused without.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetHoldingsService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads where a Fleet's holdings stand.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of every holding, with its tracks' tiers.
   */
  holdings(communityId: string, fleetId: string): Observable<FleetHoldings> {
    return this._http.get<FleetHoldings>(
      this.holdingsUrl(communityId, fleetId),
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }

  /**
   * Reads a page of a Fleet's holdings history, newest first.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param page - The page, from 1.
   * @returns An observable of the page.
   */
  history(
    communityId: string,
    fleetId: string,
    page: number,
  ): Observable<FleetHoldingHistoryPage> {
    return this._http.get<FleetHoldingHistoryPage>(
      `${this.holdingsUrl(communityId, fleetId)}/history`,
      {
        ...(this._authService.getHttpOptionsWithAccessToken() ?? {}),
        params: new HttpParams().set('page', page),
      },
    );
  }

  /**
   * Records the tiers of one holding.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param holdingCode - The holding, such as STARBASE.
   * @param request - The tracks to set, and why.
   * @returns An observable of where the holdings now stand.
   */
  record(
    communityId: string,
    fleetId: string,
    holdingCode: string,
    request: RecordFleetHoldingRequest,
  ): Observable<FleetHoldings> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.put<FleetHoldings>(
      `${this.holdingsUrl(communityId, fleetId)}/${holdingCode}`,
      request,
      options,
    );
  }

  /**
   * The address of a Fleet's holdings.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The address.
   */
  private holdingsUrl(communityId: string, fleetId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}/holdings`;
  }
}
