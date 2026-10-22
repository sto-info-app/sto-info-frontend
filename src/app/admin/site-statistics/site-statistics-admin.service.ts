import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { SiteStatistics } from 'src/app/models/site-statistics.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The Site Statistics page's numbers (FC-053), read in one go. The server
 * refuses them without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class SiteStatisticsAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Every statistic, as of now.
   *
   * @returns The statistics.
   */
  read(): Observable<SiteStatistics> {
    return this.authenticated(options =>
      this._http.get<SiteStatistics>(API_URLS.SITE_STATISTICS_ADMIN, options),
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
