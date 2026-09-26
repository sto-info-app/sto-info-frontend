import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ScanDiagnostics } from 'src/app/models/scan-diagnostics.models';
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
    const options = this._authService.getHttpOptionsWithAccessToken();
    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<ScanDiagnostics>(
      API_URLS.FILE_SCANNING_ADMIN_DIAGNOSTICS,
      options,
    );
  }
}
