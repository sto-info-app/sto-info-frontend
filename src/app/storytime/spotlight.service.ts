import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CreateSpotlightRequest,
  ManagedSpotlight,
  Spotlight,
  UpdateSpotlightRequest,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The Storytime Spotlight: editorial selections of Stories and Arcs.
 *
 * Reading needs no account. Managing needs the Spotlight permission, which is
 * checked by the server — the token is attached here so it can be.
 */
@Injectable({
  providedIn: 'root',
})
export class SpotlightService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists what the Spotlight is showing now.
   *
   * @returns An observable of the showing selections, best first.
   */
  getSpotlight(): Observable<Spotlight[]> {
    return this._http.get<Spotlight[]>(API_URLS.STORYTIME_SPOTLIGHT);
  }

  /**
   * Lists the selections that have finished showing.
   *
   * @returns An observable of the past selections, most recent first.
   */
  getArchive(): Observable<Spotlight[]> {
    return this._http.get<Spotlight[]>(
      `${API_URLS.STORYTIME_SPOTLIGHT}/archive`,
    );
  }

  /**
   * Reads one Spotlight selection.
   *
   * @param spotlightSlug - The entry slug.
   * @returns An observable of the selection.
   */
  getEntry(spotlightSlug: string): Observable<Spotlight> {
    return this._http.get<Spotlight>(
      `${API_URLS.STORYTIME_SPOTLIGHT}/${encodeURIComponent(spotlightSlug)}`,
    );
  }

  // ----- Editing -----

  /**
   * Lists every Spotlight entry, showing or not.
   *
   * @returns An observable of the entries.
   */
  getAll(): Observable<ManagedSpotlight[]> {
    return this.authenticated(options =>
      this._http.get<ManagedSpotlight[]>(
        API_URLS.STORYTIME_ADMIN_SPOTLIGHT,
        options,
      ),
    );
  }

  /**
   * Retrieves one entry for editing.
   *
   * @param spotlightId - The entry.
   * @returns An observable of the entry.
   */
  getOne(spotlightId: string): Observable<ManagedSpotlight> {
    return this.authenticated(options =>
      this._http.get<ManagedSpotlight>(this.manageUrl(spotlightId), options),
    );
  }

  /**
   * Drafts a Spotlight entry.
   *
   * @param payload - The entry to create.
   * @returns An observable of the created entry.
   */
  create(payload: CreateSpotlightRequest): Observable<ManagedSpotlight> {
    return this.authenticated(options =>
      this._http.post<ManagedSpotlight>(
        API_URLS.STORYTIME_ADMIN_SPOTLIGHT,
        payload,
        options,
      ),
    );
  }

  /**
   * Changes a Spotlight entry.
   *
   * @param spotlightId - The entry.
   * @param payload - The changes.
   * @returns An observable of the updated entry.
   */
  update(
    spotlightId: string,
    payload: UpdateSpotlightRequest,
  ): Observable<ManagedSpotlight> {
    return this.authenticated(options =>
      this._http.patch<ManagedSpotlight>(
        this.manageUrl(spotlightId),
        payload,
        options,
      ),
    );
  }

  /**
   * Publishes an entry, so it may show when its time comes.
   *
   * @param spotlightId - The entry.
   * @returns An observable of the published entry.
   */
  publish(spotlightId: string): Observable<ManagedSpotlight> {
    return this.entryAction(spotlightId, 'publish');
  }

  /**
   * Withdraws an entry from showing.
   *
   * @param spotlightId - The entry.
   * @returns An observable of the withdrawn entry.
   */
  unpublish(spotlightId: string): Observable<ManagedSpotlight> {
    return this.entryAction(spotlightId, 'unpublish');
  }

  /**
   * Deletes a Spotlight entry.
   *
   * @param spotlightId - The entry.
   * @returns An observable that completes when the entry is deleted.
   */
  remove(spotlightId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(this.manageUrl(spotlightId), options),
    );
  }

  /**
   * Builds the editorial URL for an entry.
   *
   * @param spotlightId - The entry.
   * @returns The URL.
   */
  private manageUrl(spotlightId: string): string {
    return `${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${spotlightId}`;
  }

  /**
   * Performs a state-changing action on an entry.
   *
   * @param spotlightId - The entry.
   * @param action - The action path segment.
   * @returns An observable of the resulting entry.
   */
  private entryAction(
    spotlightId: string,
    action: string,
  ): Observable<ManagedSpotlight> {
    return this.authenticated(options =>
      this._http.post<ManagedSpotlight>(
        `${this.manageUrl(spotlightId)}/${action}`,
        {},
        options,
      ),
    );
  }

  /**
   * Runs a request with the access token attached.
   *
   * @param request - Builds the request from the authenticated options.
   * @returns The request's observable, or an error when there is no token.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return request(httpOptions);
  }
}
