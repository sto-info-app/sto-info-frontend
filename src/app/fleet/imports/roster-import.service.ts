import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { RosterImportPreview } from 'src/app/models/fleet-import.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The multipart field a roster export is sent in. */
const ROSTER_FIELD = 'roster';

/**
 * Asking the server how it would read a roster export.
 *
 * One call, and it stores nothing. The file goes up, the server reads it as
 * far as it can and answers with what it found; no asset is registered, no
 * bytes are kept and no import exists afterwards. Sending the same file twice
 * is the same as sending it once.
 *
 * The timezone travels with the file because the file does not contain it. An
 * STO export writes wall-clock times in its filename and in every date column
 * and never says whose clock they were, so nothing about it can be read until
 * somebody says — and the answer is the uploader's to give, not this
 * application's to guess.
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
    const formData = new FormData();

    // The name is sent as the third argument rather than left to the browser,
    // so the server is asked about the file the reader chose rather than
    // about whatever the field happened to be called.
    formData.append(ROSTER_FIELD, file, file.name);
    formData.append('timezone', timezone);

    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<RosterImportPreview>(
      this.previewUrl(communityId, fleetId),
      formData,
      httpOptions,
    );
  }

  /**
   * Builds the address of a Fleet's roster import preview.
   *
   * Nested under the Community because the route states the tenancy, and the
   * server checks it: a Fleet belonging to a different Community than the
   * address claims resolves to nothing.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The endpoint to call.
   */
  private previewUrl(communityId: string, fleetId: string): string {
    return (
      `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
      '/roster-imports/preview'
    );
  }
}
