import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  SecurityLogPage,
  SecurityLogSource,
} from 'src/app/models/security-log.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site admins' Security Log (FC-039): what site admins and the
 * retention jobs did, from every log that holds it. The server refuses it
 * without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class SecurityLogAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * A page of the log, newest first.
   *
   * @param source - One source only, or every one.
   * @param page - Which page, from 1.
   * @returns The page.
   */
  list(
    source: SecurityLogSource | null,
    page: number,
  ): Observable<SecurityLogPage> {
    let params = new HttpParams().set('page', page);

    if (source !== null) {
      params = params.set('source', source);
    }

    return this.authenticated(options =>
      this._http.get<SecurityLogPage>(API_URLS.SECURITY_LOG_ADMIN, {
        ...options,
        params,
      }),
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
