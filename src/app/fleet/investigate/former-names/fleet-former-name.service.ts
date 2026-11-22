import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FleetFormerName,
  FleetFormerNameList,
  RecordFleetFormerName,
} from 'src/app/models/fleet-former-name.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading a Fleet's former names, recording one and removing one (FC-050).
 *
 * Removing a name keeps it, with who removed it and why: an import that
 * matched it keeps its match, and the name matches nothing new.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetFormerNameService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a Fleet's former names, in use and removed.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the names, and whether the reader may change
   *   them.
   */
  list(communityId: string, fleetId: string): Observable<FleetFormerNameList> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<FleetFormerNameList>(
      this.formerNamesUrl(communityId, fleetId),
      httpOptions,
    );
  }

  /**
   * Records a former name.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param name - The name, exactly, when it was used, and why it is recorded.
   * @returns An observable of the name as recorded.
   */
  record(
    communityId: string,
    fleetId: string,
    name: RecordFleetFormerName,
  ): Observable<FleetFormerName> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<FleetFormerName>(
      this.formerNamesUrl(communityId, fleetId),
      name,
      httpOptions,
    );
  }

  /**
   * Removes a former name, saying why.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param aliasId - The name.
   * @param reason - Why it is removed.
   * @returns An observable of the name as it now stands.
   */
  remove(
    communityId: string,
    fleetId: string,
    aliasId: string,
    reason: string,
  ): Observable<FleetFormerName> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<FleetFormerName>(
      `${this.formerNamesUrl(communityId, fleetId)}/${aliasId}/removal`,
      { reason },
      httpOptions,
    );
  }

  /**
   * Where a Fleet's former names live.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The URL, without a trailing slash.
   */
  private formerNamesUrl(communityId: string, fleetId: string): string {
    return (
      `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
      '/former-names'
    );
  }
}
