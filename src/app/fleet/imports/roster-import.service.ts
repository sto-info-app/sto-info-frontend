import { HttpClient, HttpParams, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RosterImportConflictFilter,
  RosterImportConflictPage,
  RosterImportDetail,
  RosterImportPage,
  RosterImportPreview,
  RosterImportSummary,
  RosterImportUploadResult,
} from 'src/app/models/fleet-import.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The multipart field a roster export is sent in. */
const ROSTER_FIELD = 'roster';

/**
 * Checking, importing and following a Fleet's roster exports.
 *
 * The preview stores nothing. The file goes up, the server reads it as far as
 * it can and answers with what it found; no asset is registered, no bytes are
 * kept and no import exists afterwards. The upload is the same file sent
 * again with the same answers, and this time it is kept — quarantined,
 * scanned and read after the answer has come back, which is why there is a
 * status to follow at all.
 *
 * The timezone travels with the file both times because the file does not
 * contain it. An STO export writes wall-clock times in its filename and in
 * every date column and never says whose clock they were, so nothing about it
 * can be read until somebody says — and the answer is the uploader's to give,
 * not this application's to guess.
 */
@Injectable({
  providedIn: 'root',
})
export class RosterImportService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Asks how an export would be read, without importing it.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet the export belongs to.
   * @param file - The export, exactly as the game wrote it. The filename
   *   matters: it is the only place the file says which Fleet it is of and
   *   when it was taken.
   * @param timezone - The IANA zone the exporting player's clock was set to.
   * @returns An observable of how the file would be read.
   */
  preview(
    communityId: string,
    fleetId: string,
    file: File,
    timezone: string,
  ): Observable<RosterImportPreview> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<RosterImportPreview>(
      `${this.importsUrl(communityId, fleetId)}/preview`,
      this.body(file, timezone, null),
      httpOptions,
    );
  }

  /**
   * Imports an export.
   *
   * The server answers `202` for a new import, which is on its way to a
   * scanner, and `200` for a file this Fleet has already imported the same
   * way, which is returned unchanged. Both carry the import exactly as the
   * listing reports it; the status code is the only thing telling them apart,
   * so it is read here rather than thrown away.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet the export belongs to.
   * @param file - The export, exactly as the game wrote it.
   * @param timezone - The IANA zone the exporting player's clock was set to.
   * @param exportedAt - Which of two moments the filename stamp names, for
   *   the hour the clock went back over; null for every other stamp.
   * @returns An observable of the import, and whether it was a repeat.
   */
  upload(
    communityId: string,
    fleetId: string,
    file: File,
    timezone: string,
    exportedAt: string | null,
  ): Observable<RosterImportUploadResult> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http
      .post<RosterImportSummary>(
        this.importsUrl(communityId, fleetId),
        this.body(file, timezone, exportedAt),
        { ...httpOptions, observe: 'response' },
      )
      .pipe(
        map(response => ({
          summary: response.body as RosterImportSummary,
          repeated: response.status === HttpStatusCode.Ok,
        })),
      );
  }

  /**
   * Reads a page of a Fleet's imports, newest first.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param page - The page, from 1.
   * @param pageSize - How many to a page, or undefined for the server's own.
   * @returns An observable of the page.
   */
  list(
    communityId: string,
    fleetId: string,
    page: number,
    pageSize?: number,
  ): Observable<RosterImportPage> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    let params = new HttpParams().set('page', String(page));

    if (pageSize) {
      params = params.set('pageSize', String(pageSize));
    }

    return this._http.get<RosterImportPage>(
      this.importsUrl(communityId, fleetId),
      { ...httpOptions, params },
    );
  }

  /**
   * Reads one import, with whatever of its detail the reader may see.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param importId - The import.
   * @returns An observable of the import.
   */
  detail(
    communityId: string,
    fleetId: string,
    importId: string,
  ): Observable<RosterImportDetail> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<RosterImportDetail>(
      `${this.importsUrl(communityId, fleetId)}/${importId}`,
      httpOptions,
    );
  }

  /**
   * Reads a page of a Fleet's conflict groups, latest moment first (FC-020).
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param state - Which groups: those waiting, those settled, or every one.
   * @param page - The page, from 1.
   * @returns An observable of the page.
   */
  conflicts(
    communityId: string,
    fleetId: string,
    state: RosterImportConflictFilter,
    page: number,
  ): Observable<RosterImportConflictPage> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<RosterImportConflictPage>(
      `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
        '/roster-import-conflicts',
      {
        ...httpOptions,
        params: new HttpParams().set('state', state).set('page', String(page)),
      },
    );
  }

  /**
   * Selects the export that stands for a moment several exports claim
   * (FC-019). Selecting another export of the moment changes it.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param importId - The export to select.
   * @param reason - Why, in the investigator's own words.
   * @returns An observable of the import, as an investigator sees it.
   */
  select(
    communityId: string,
    fleetId: string,
    importId: string,
    reason: string,
  ): Observable<RosterImportDetail> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<RosterImportDetail>(
      `${this.importsUrl(communityId, fleetId)}/${importId}/selection`,
      { reason },
      httpOptions,
    );
  }

  /**
   * Builds the multipart body an export travels in.
   *
   * @param file - The export.
   * @param timezone - The zone it was taken in.
   * @param exportedAt - The chosen moment, or null when there was no choice.
   * @returns The body.
   */
  private body(
    file: File,
    timezone: string,
    exportedAt: string | null,
  ): FormData {
    const formData = new FormData();

    // The name is sent as the third argument rather than left to the browser,
    // so the server is asked about the file the reader chose rather than
    // about whatever the field happened to be called.
    formData.append(ROSTER_FIELD, file, file.name);
    formData.append('timezone', timezone);

    if (exportedAt !== null) {
      formData.append('exportedAt', exportedAt);
    }

    return formData;
  }

  /**
   * Builds the address of a Fleet's roster imports.
   *
   * Nested under the Community because the route states the tenancy, and the
   * server checks it: a Fleet belonging to a different Community than the
   * address claims resolves to nothing.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The collection's address.
   */
  private importsUrl(communityId: string, fleetId: string): string {
    return (
      `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
      '/roster-imports'
    );
  }
}
