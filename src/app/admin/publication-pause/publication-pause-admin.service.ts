import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { PublicationPause } from 'src/app/models/scan-diagnostics.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site admins' publication pause (FC-042): while it is on, uploads are
 * still accepted and scanned, and nothing is published until it is off. The
 * server refuses all of it without the ADMIN role, whatever the client
 * believes.
 */
@Injectable({
  providedIn: 'root',
})
export class PublicationPauseAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Whether publication is paused.
   *
   * @returns The switch, and the queue as it stands.
   */
  read(): Observable<PublicationPause> {
    return this.authenticated(options =>
      this._http.get<PublicationPause>(
        API_URLS.FILE_PUBLICATION_ADMIN,
        options,
      ),
    );
  }

  /**
   * Pauses or resumes publication.
   *
   * @param action - Which.
   * @param reason - Why, for the site admin log.
   * @returns The switch, as it now stands.
   */
  set(
    action: 'pause' | 'resume',
    reason: string,
  ): Observable<PublicationPause> {
    return this.authenticated(options =>
      this._http.post<PublicationPause>(
        `${API_URLS.FILE_PUBLICATION_ADMIN}/${action}`,
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
