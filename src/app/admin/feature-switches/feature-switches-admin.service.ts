import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FeatureSwitchKey,
  FeatureSwitchState,
} from 'src/app/models/feature-switches.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site features' master switches (FC-045): Fleet Communities, Storytime
 * and Custom Tracking. The server refuses all of it without the ADMIN role,
 * whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class FeatureSwitchesAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Every switch, with the capability flags beneath it.
   *
   * @returns The switches, in the order the page lists them.
   */
  list(): Observable<FeatureSwitchState[]> {
    return this.authenticated(options =>
      this._http.get<FeatureSwitchState[]>(
        API_URLS.FEATURE_SWITCHES_ADMIN,
        options,
      ),
    );
  }

  /**
   * Switches a feature on or off.
   *
   * @param feature - The feature.
   * @param isEnabled - Whether it should be on.
   * @param reason - Why, for the site admin log.
   * @returns The switch, as it now stands.
   */
  set(
    feature: FeatureSwitchKey,
    isEnabled: boolean,
    reason: string,
  ): Observable<FeatureSwitchState> {
    return this.authenticated(options =>
      this._http.patch<FeatureSwitchState>(
        `${API_URLS.FEATURE_SWITCHES_ADMIN}/${feature}`,
        { isEnabled, reason },
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
