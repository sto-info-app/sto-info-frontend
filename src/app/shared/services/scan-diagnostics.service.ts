import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ScanAssetDetail,
  ScanDiagnostics,
  ScanRejectionPage,
} from 'src/app/models/scan-diagnostics.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reads the file scanning pipeline's usage, engine status and backlog for the
 * admin scan diagnostics page (FC-003).
 *
 * Nothing is cached: an administrator opens this page to see what is
 * happening now. The route is refused server-side without the ADMIN role.
 */
@Injectable({
  providedIn: 'root',
})
export class ScanDiagnosticsService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads the diagnostics.
   *
   * @returns An observable of the diagnostics, or one that errors when signed
   *   out.
   */
  read(): Observable<ScanDiagnostics> {
    return this.authenticated(options =>
      this._http.get<ScanDiagnostics>(
        API_URLS.FILE_SCANNING_ADMIN_DIAGNOSTICS,
        options,
      ),
    );
  }

  /**
   * A page of the assets a scanner or policy refused, newest first (FC-039).
   *
   * @param page - Which page, from 1.
   * @returns An observable of the page.
   */
  rejections(page: number): Observable<ScanRejectionPage> {
    return this.authenticated(options =>
      this._http.get<ScanRejectionPage>(
        API_URLS.FILE_SCANNING_ADMIN_REJECTIONS,
        { ...options, params: new HttpParams().set('page', page) },
      ),
    );
  }

  /**
   * One asset's scan outcome (FC-039).
   *
   * @param assetId - The asset.
   * @returns An observable of its outcome.
   */
  asset(assetId: string): Observable<ScanAssetDetail> {
    return this.authenticated(options =>
      this._http.get<ScanAssetDetail>(
        `${API_URLS.FILE_SCANNING_ADMIN_ASSETS}/${encodeURIComponent(assetId)}`,
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
