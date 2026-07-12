import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  EndeavourCategory,
  EndeavourProgress,
  EndeavourSortBy,
  EndeavourSummary,
} from '../models/endeavour.model';

@Injectable({
  providedIn: 'root',
})
export class EndeavourService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getProgress(
    accountId: string,
    options?: {
      category?: EndeavourCategory;
      sortBy?: EndeavourSortBy;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Observable<EndeavourProgress[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    let params = new HttpParams();
    if (options?.category) params = params.set('category', options.category);
    if (options?.sortBy) params = params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params = params.set('sortOrder', options.sortOrder);

    return this._http.get<EndeavourProgress[]>(
      `${API_URLS.ENDEAVOUR}/account/${accountId}`,
      { ...httpOptions, params },
    );
  }

  getSummary(accountId: string): Observable<EndeavourSummary> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<EndeavourSummary>(
      `${API_URLS.ENDEAVOUR}/account/${accountId}/summary`,
      httpOptions,
    );
  }

  updateProgress(
    accountId: string,
    perkId: string,
    currentNodes: number,
  ): Observable<EndeavourProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<EndeavourProgress>(
      `${API_URLS.ENDEAVOUR}/account/${accountId}/perk/${perkId}`,
      { currentNodes },
      httpOptions,
    );
  }
}
