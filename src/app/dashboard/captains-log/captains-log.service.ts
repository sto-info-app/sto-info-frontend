import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AdminLogEntry,
  CreateLogEntryRequest,
  LogEntry,
  LogEntryPage,
  LogEntryQuery,
  PublicLogEntry,
  UpdateLogEntryRequest,
} from 'src/app/models/captains-log.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

import { LOG_PICTURE_SPEC } from './captains-log.constants';

/** The options every signed-in request is sent with. */
type HttpOptions = NonNullable<
  ReturnType<AuthService['getHttpOptionsWithAccessToken']>
>;

/**
 * The Captain's Log (sc-1450): a member's own entries, the Captain's entries
 * on a public profile, and a site admin's view of a reported one.
 */
@Injectable({ providedIn: 'root' })
export class CaptainsLogService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the signed-in member's own entries, newest first.
   *
   * @param query - The type, if only one, and the page.
   * @returns A page of entries.
   */
  list(query: LogEntryQuery = {}): Observable<LogEntryPage<LogEntry>> {
    return this.signedIn(options =>
      this._http.get<LogEntryPage<LogEntry>>(API_URLS.CAPTAINS_LOG, {
        ...options,
        params: this.paramsOf(query),
      }),
    );
  }

  /**
   * Reads one of the signed-in member's own entries.
   *
   * @param id - The entry.
   * @returns The entry.
   */
  get(id: string): Observable<LogEntry> {
    return this.signedIn(options =>
      this._http.get<LogEntry>(this.entryUrl(id), options),
    );
  }

  /**
   * Writes a new entry.
   *
   * @param request - The type, headline and body.
   * @returns The entry, stamped with its stardate.
   */
  create(request: CreateLogEntryRequest): Observable<LogEntry> {
    return this.signedIn(options =>
      this._http.post<LogEntry>(API_URLS.CAPTAINS_LOG, request, options),
    );
  }

  /**
   * Changes one of the signed-in member's own entries.
   *
   * @param id - The entry.
   * @param request - What to change.
   * @returns The entry.
   */
  update(id: string, request: UpdateLogEntryRequest): Observable<LogEntry> {
    return this.signedIn(options =>
      this._http.patch<LogEntry>(this.entryUrl(id), request, options),
    );
  }

  /**
   * Deletes one of the signed-in member's own entries for good.
   *
   * @param id - The entry.
   * @returns Completes once it is gone.
   */
  delete(id: string): Observable<void> {
    return this.signedIn(options =>
      this._http.delete<void>(this.entryUrl(id), options),
    );
  }

  /**
   * Sends an entry's picture to be scanned.
   *
   * @param id - The entry.
   * @param image - The cropped picture.
   * @param altText - What it shows.
   * @returns The upload to watch.
   */
  uploadPicture(
    id: string,
    image: Blob,
    altText: string,
  ): Observable<AcceptedAsset> {
    const formData = new FormData();

    formData.append(
      'image',
      image,
      `${LOG_PICTURE_SPEC.endpoint}.${LOG_PICTURE_SPEC.outputFormat}`,
    );
    formData.append('altText', altText);

    return this.signedIn(options =>
      this._http.post<AcceptedAsset>(this.pictureUrl(id), formData, options),
    );
  }

  /**
   * Takes an entry's picture down.
   *
   * @param id - The entry.
   * @returns Completes once it is gone.
   */
  removePicture(id: string): Observable<void> {
    return this.signedIn(options =>
      this._http.delete<void>(this.pictureUrl(id), options),
    );
  }

  /**
   * Lists the Captain's entries on a public profile, newest first.
   *
   * @param username - The profile's username.
   * @param page - The page.
   * @returns A page of entries.
   */
  listPublic(
    username: string,
    page = 1,
  ): Observable<LogEntryPage<PublicLogEntry>> {
    const options = this._authService.getHttpOptionsWithAccessToken() ?? {};

    return this._http.get<LogEntryPage<PublicLogEntry>>(
      `${API_URLS.CAPTAINS_LOG_PUBLIC}/${encodeURIComponent(username)}`,
      { ...options, params: this.paramsOf({ page }) },
    );
  }

  /**
   * Reads any entry, for a site admin working a report.
   *
   * @param id - The entry.
   * @returns The entry and its author.
   */
  getForAdmin(id: string): Observable<AdminLogEntry> {
    return this.signedIn(options =>
      this._http.get<AdminLogEntry>(
        `${API_URLS.CAPTAINS_LOG_ADMIN}/${id}`,
        options,
      ),
    );
  }

  /**
   * Removes a reported entry from its author's profile.
   *
   * @param id - The entry.
   * @param reason - Why, for the author and the Security Log.
   * @returns The entry, removed.
   */
  removeForAdmin(id: string, reason: string): Observable<AdminLogEntry> {
    return this.signedIn(options =>
      this._http.post<AdminLogEntry>(
        `${API_URLS.CAPTAINS_LOG_ADMIN}/${id}/remove`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Sends a request that needs the member signed in, or fails straight away
   * when there is no token to send.
   *
   * @param send - Sends it, with the options.
   * @returns What it answers.
   */
  private signedIn<T>(
    send: (options: HttpOptions) => Observable<T>,
  ): Observable<T> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    return options
      ? send(options)
      : throwError(() => new Error('No token found'));
  }

  /**
   * An entry's address.
   *
   * @param id - The entry.
   * @returns It.
   */
  private entryUrl(id: string): string {
    return `${API_URLS.CAPTAINS_LOG}/${id}`;
  }

  /**
   * An entry's picture's address.
   *
   * @param id - The entry.
   * @returns It.
   */
  private pictureUrl(id: string): string {
    return `${this.entryUrl(id)}/${LOG_PICTURE_SPEC.endpoint}`;
  }

  /**
   * The query a list is asked for with, leaving out what was not given.
   *
   * @param query - The type and page.
   * @returns The parameters.
   */
  private paramsOf(query: LogEntryQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
