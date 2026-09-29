import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ImageEstateRun,
  ImageEstateRunKind,
  ImageEstateStatus,
  ImageInventory,
} from 'src/app/models/image-estate.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site admins' image estate (FC-040): its inventory, and the runs that
 * move every picture to private delivery. The server refuses all of it
 * without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class ImageEstateAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Where the estate stands.
   *
   * @returns The status.
   */
  status(): Observable<ImageEstateStatus> {
    return this.authenticated(options =>
      this._http.get<ImageEstateStatus>(API_URLS.IMAGE_ESTATE_ADMIN, options),
    );
  }

  /**
   * Takes an inventory. It reports and changes nothing.
   *
   * @returns The inventory, running.
   */
  takeInventory(): Observable<ImageInventory> {
    return this.authenticated(options =>
      this._http.post<ImageInventory>(
        `${API_URLS.IMAGE_ESTATE_ADMIN}/inventory`,
        {},
        options,
      ),
    );
  }

  /**
   * Starts a copy, an undo or a retirement.
   *
   * @param kind - Which.
   * @param reason - Why, for the site admin log.
   * @returns The run.
   */
  start(kind: ImageEstateRunKind, reason: string): Observable<ImageEstateRun> {
    return this.authenticated(options =>
      this._http.post<ImageEstateRun>(
        `${API_URLS.IMAGE_ESTATE_ADMIN}/runs`,
        { kind, reason },
        options,
      ),
    );
  }

  /**
   * Pauses the open run after its batch.
   *
   * @param reason - Why.
   * @returns The run.
   */
  pause(reason: string): Observable<ImageEstateRun> {
    return this.authenticated(options =>
      this._http.post<ImageEstateRun>(
        `${API_URLS.IMAGE_ESTATE_ADMIN}/runs/pause`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Resumes a paused or failed run.
   *
   * @param reason - Why.
   * @returns The run.
   */
  resume(reason: string): Observable<ImageEstateRun> {
    return this.authenticated(options =>
      this._http.post<ImageEstateRun>(
        `${API_URLS.IMAGE_ESTATE_ADMIN}/runs/resume`,
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
