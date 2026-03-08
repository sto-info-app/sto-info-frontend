import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StatsData } from '../stats/stats.component';

@Injectable({
  providedIn: 'root',
})
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches pre-computed statistics for the current user.
   * @param accountId Optional account ID to filter by.
   * @returns An observable of StatsData.
   */
  getStats(accountId?: string | null): Observable<StatsData> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    let url = API_URLS.STATS;
    if (accountId) {
      url += `?accountId=${accountId}`;
    }

    return this.http.get<StatsData>(url, httpOptions);
  }
}
