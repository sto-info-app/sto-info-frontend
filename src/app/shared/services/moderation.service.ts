import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CreateUserReportRequest,
  DisableUserRequest,
  ModeratedUser,
  ModeratedUserQuery,
  PaginatedModeratedUsers,
  PaginatedReports,
  ReportQuery,
  UpdateReportRequest,
  UserReport,
} from 'src/app/models/moderation.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reporting a member, and the administrator side that answers those reports.
 *
 * Every endpoint here is authenticated, so each call attaches the access token
 * and fails fast when there is none. Only {@link reportMember} is reachable by
 * an ordinary member; the rest are refused server-side without the ADMIN role,
 * whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class ModerationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Member -----

  /**
   * Reports a member to the site's administrators.
   *
   * Nothing comes back on purpose — the reporter is told it was received and
   * nothing else about what happens next.
   *
   * @param payload - The member to report, the category and the details.
   * @returns An observable that completes when the report is received.
   */
  reportMember(payload: CreateUserReportRequest): Observable<void> {
    return this.authenticated<void>(options =>
      this._http.post<void>(API_URLS.REPORTS, payload, options),
    );
  }

  // ----- Admin: reports -----

  /**
   * Lists reports in the moderation queue.
   *
   * @param query - Optional status, reason, search and pagination options.
   * @returns An observable of the paginated reports.
   */
  getReports(query: ReportQuery = {}): Observable<PaginatedReports> {
    return this.authenticated<PaginatedReports>(options =>
      this._http.get<PaginatedReports>(API_URLS.MODERATION_ADMIN_REPORTS, {
        ...options,
        params: this.buildReportParams(query),
      }),
    );
  }

  /**
   * Retrieves a single report.
   *
   * @param reportId - The report to retrieve.
   * @returns An observable of the report.
   */
  getReport(reportId: string): Observable<UserReport> {
    return this.authenticated<UserReport>(options =>
      this._http.get<UserReport>(
        `${API_URLS.MODERATION_ADMIN_REPORTS}/${reportId}`,
        options,
      ),
    );
  }

  /**
   * Records a decision on a report.
   *
   * @param reportId - The report to update.
   * @param payload - The new status and any notes.
   * @returns An observable of the updated report.
   */
  updateReport(
    reportId: string,
    payload: UpdateReportRequest,
  ): Observable<UserReport> {
    return this.authenticated<UserReport>(options =>
      this._http.patch<UserReport>(
        `${API_URLS.MODERATION_ADMIN_REPORTS}/${reportId}`,
        payload,
        options,
      ),
    );
  }

  // ----- Admin: members -----

  /**
   * Lists members, for finding the account behind a report.
   *
   * @param query - Optional search, disabled filter and pagination options.
   * @returns An observable of the paginated members.
   */
  getUsers(
    query: ModeratedUserQuery = {},
  ): Observable<PaginatedModeratedUsers> {
    return this.authenticated<PaginatedModeratedUsers>(options =>
      this._http.get<PaginatedModeratedUsers>(API_URLS.MODERATION_ADMIN_USERS, {
        ...options,
        params: this.buildUserParams(query),
      }),
    );
  }

  /**
   * Disables a member's account, ending their sessions and closing the reports
   * against them.
   *
   * @param userId - The member to disable.
   * @param payload - The reason recorded against the account.
   * @returns An observable of the updated member.
   */
  disableUser(
    userId: string,
    payload: DisableUserRequest = {},
  ): Observable<ModeratedUser> {
    return this.authenticated<ModeratedUser>(options =>
      this._http.post<ModeratedUser>(
        `${API_URLS.MODERATION_ADMIN_USERS}/${userId}/disable`,
        payload,
        options,
      ),
    );
  }

  /**
   * Restores a disabled member's account.
   *
   * @param userId - The member to restore.
   * @returns An observable of the updated member.
   */
  enableUser(userId: string): Observable<ModeratedUser> {
    return this.authenticated<ModeratedUser>(options =>
      this._http.post<ModeratedUser>(
        `${API_URLS.MODERATION_ADMIN_USERS}/${userId}/enable`,
        {},
        options,
      ),
    );
  }

  // ----- Helpers -----

  /**
   * Runs a request with the access token attached, or fails when there is no
   * token to attach.
   *
   * @param request - Builds the request from the resolved HTTP options.
   * @returns The request's observable, or one that errors when signed out.
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

  /**
   * Builds the report queue query string, omitting any unset value.
   *
   * @param query - The report query.
   * @returns The HTTP params to send.
   */
  private buildReportParams(query: ReportQuery): HttpParams {
    let params = new HttpParams();

    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.reason) {
      params = params.set('reason', query.reason);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return params;
  }

  /**
   * Builds the member listing query string, omitting any unset value.
   *
   * The disabled filter is sent whenever it is set at all, since `false` is a
   * meaningful value here — "active members only" — rather than an absent one.
   *
   * @param query - The member query.
   * @returns The HTTP params to send.
   */
  private buildUserParams(query: ModeratedUserQuery): HttpParams {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.disabled !== undefined) {
      params = params.set('disabled', String(query.disabled));
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return params;
  }
}
