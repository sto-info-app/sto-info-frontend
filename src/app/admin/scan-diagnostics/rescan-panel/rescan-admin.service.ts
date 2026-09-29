import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RescanCampaign,
  RescanOverview,
  RescanSelection,
} from 'src/app/models/rescan.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site admins' rescan campaigns (FC-041). The server refuses all of it
 * without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class RescanAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Where the campaigns stand.
   *
   * @returns The overview.
   */
  overview(): Observable<RescanOverview> {
    return this.authenticated(options =>
      this._http.get<RescanOverview>(API_URLS.RESCAN_CAMPAIGNS_ADMIN, options),
    );
  }

  /**
   * Starts a campaign.
   *
   * @param selection - Which pictures.
   * @param reason - Why, for the site admin log.
   * @returns The campaign.
   */
  start(
    selection: RescanSelection,
    reason: string,
  ): Observable<RescanCampaign> {
    return this.authenticated(options =>
      this._http.post<RescanCampaign>(
        API_URLS.RESCAN_CAMPAIGNS_ADMIN,
        { selection, reason },
        options,
      ),
    );
  }

  /**
   * Pauses, resumes or cancels a campaign.
   *
   * @param campaignId - The campaign.
   * @param action - Which.
   * @param reason - Why.
   * @returns The campaign.
   */
  act(
    campaignId: string,
    action: 'pause' | 'resume' | 'cancel',
    reason: string,
  ): Observable<RescanCampaign> {
    return this.authenticated(options =>
      this._http.post<RescanCampaign>(
        `${API_URLS.RESCAN_CAMPAIGNS_ADMIN}/${campaignId}/${action}`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Sends a request with the access token, or fails without one.
   *
   * @param request - The request.
   * @returns Its response.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return request(options);
  }
}
