import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChatReportDecision,
  ChatReportDetail,
  ChatReportPage,
} from 'src/app/models/fleet-chat.models';
import { ReportStatus } from 'src/app/models/moderation.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The admin queue's filters. */
export interface ChatReportQuery {
  readonly status?: ReportStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

/**
 * The site admins' queue of chat reports (FC-035): list, read with evidence,
 * resolve or dismiss, and remove the reported message. The server refuses
 * all of it without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatReportAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists reports, oldest first.
   *
   * @param query - The filters and the page.
   * @returns A page.
   */
  list(query: ChatReportQuery = {}): Observable<ChatReportPage> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }

    return this.authenticated(options =>
      this._http.get<ChatReportPage>(API_URLS.CHAT_ADMIN_REPORTS, {
        ...options,
        params,
      }),
    );
  }

  /**
   * Reads a report and its evidence.
   *
   * @param reportId - The report.
   * @returns It.
   */
  detail(reportId: string): Observable<ChatReportDetail> {
    return this.authenticated(options =>
      this._http.get<ChatReportDetail>(
        `${API_URLS.CHAT_ADMIN_REPORTS}/${reportId}`,
        options,
      ),
    );
  }

  /**
   * Resolves or dismisses a report.
   *
   * @param reportId - The report.
   * @param decision - The outcome and a note.
   * @returns The report.
   */
  decide(
    reportId: string,
    decision: ChatReportDecision,
  ): Observable<ChatReportDetail> {
    return this.authenticated(options =>
      this._http.post<ChatReportDetail>(
        `${API_URLS.CHAT_ADMIN_REPORTS}/${reportId}/decision`,
        decision,
        options,
      ),
    );
  }

  /**
   * Removes the reported message.
   *
   * @param reportId - The report.
   * @param reason - Why, for the log.
   * @returns The report.
   */
  removeMessage(
    reportId: string,
    reason: string,
  ): Observable<ChatReportDetail> {
    return this.authenticated(options =>
      this._http.post<ChatReportDetail>(
        `${API_URLS.CHAT_ADMIN_REPORTS}/${reportId}/remove-message`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Runs a request with the access token, or refuses without one.
   *
   * @param request - The request.
   * @returns Its answer.
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
