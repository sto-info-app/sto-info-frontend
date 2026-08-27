import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AppealStatus,
  CreateAppealRequest,
  CreateReportRequest,
  ModerateContentRequest,
  ModerationActionEntry,
  ModerationAppeal,
  StorytimeReport,
  StorytimeReportReceipt,
  StorytimeReportStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reporting content, appealing a removal, and the moderation queue behind
 * both.
 *
 * Everything here needs sign-in. An anonymous report cannot be followed up or
 * answered, and an appeal from somebody who is not the author is not an
 * appeal.
 */
@Injectable({
  providedIn: 'root',
})
export class StorytimeModerationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- What a member may do -----

  /**
   * Reports a piece of content.
   *
   * @param payload - What is being reported and why.
   * @returns An observable of the receipt.
   */
  report(payload: CreateReportRequest): Observable<StorytimeReportReceipt> {
    return this.authenticated(options =>
      this._http.post<StorytimeReportReceipt>(
        API_URLS.STORYTIME_REPORTS,
        payload,
        options,
      ),
    );
  }

  /**
   * Appeals against something of the caller's being removed.
   *
   * @param payload - What was removed, and what they have to say.
   * @returns An observable of the appeal.
   */
  appeal(payload: CreateAppealRequest): Observable<ModerationAppeal> {
    return this.authenticated(options =>
      this._http.post<ModerationAppeal>(
        API_URLS.STORYTIME_APPEALS,
        payload,
        options,
      ),
    );
  }

  /**
   * Lists the caller's own appeals.
   *
   * @returns An observable of their appeals, most recent first.
   */
  getMyAppeals(): Observable<ModerationAppeal[]> {
    return this.authenticated(options =>
      this._http.get<ModerationAppeal[]>(API_URLS.STORYTIME_APPEALS, options),
    );
  }

  /**
   * Takes an appeal back before it is decided.
   *
   * @param appealId - The appeal.
   * @returns An observable of the withdrawn appeal.
   */
  withdrawAppeal(appealId: string): Observable<ModerationAppeal> {
    return this.authenticated(options =>
      this._http.post<ModerationAppeal>(
        `${API_URLS.STORYTIME_APPEALS}/${appealId}/withdraw`,
        {},
        options,
      ),
    );
  }

  // ----- The moderation queue -----

  /**
   * Lists the reports in the queue.
   *
   * @param status - The state to filter to, if any.
   * @returns An observable of the reports.
   */
  getReports(status?: StorytimeReportStatus): Observable<StorytimeReport[]> {
    return this.authenticated(options =>
      this._http.get<StorytimeReport[]>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports`,
        {
          ...options,
          params: status ? new HttpParams().set('status', status) : undefined,
        },
      ),
    );
  }

  /**
   * Reads one report.
   *
   * @param reportId - The report.
   * @returns An observable of the report.
   */
  getReport(reportId: string): Observable<StorytimeReport> {
    return this.authenticated(options =>
      this._http.get<StorytimeReport>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports/${reportId}`,
        options,
      ),
    );
  }

  /**
   * Moves a report along, or closes it.
   *
   * @param reportId - The report.
   * @param payload - The state to move it to, and what was decided.
   * @returns An observable of the report after the change.
   */
  resolveReport(
    reportId: string,
    payload: { status: StorytimeReportStatus; resolution?: string },
  ): Observable<StorytimeReport> {
    return this.authenticated(options =>
      this._http.patch<StorytimeReport>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports/${reportId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Lists every report about one piece of content.
   *
   * @param targetType - The kind of content.
   * @param targetId - The content.
   * @returns An observable of the reports.
   */
  getReportsForTarget(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<StorytimeReport[]> {
    return this.authenticated(options =>
      this._http.get<StorytimeReport[]>(
        `${this.contentUrl(targetType, targetId)}/reports`,
        options,
      ),
    );
  }

  /**
   * Reads what has been done to one piece of content.
   *
   * @param targetType - The kind of content.
   * @param targetId - The content.
   * @returns An observable of the history, most recent first.
   */
  getHistory(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<ModerationActionEntry[]> {
    return this.authenticated(options =>
      this._http.get<ModerationActionEntry[]>(
        `${this.contentUrl(targetType, targetId)}/history`,
        options,
      ),
    );
  }

  /**
   * Removes a piece of content from public view.
   *
   * @param payload - What to remove, why, and what to tell the creator.
   * @returns An observable of the audit entry written.
   */
  removeContent(
    payload: ModerateContentRequest,
  ): Observable<ModerationActionEntry> {
    return this.moderationAction('remove', payload);
  }

  /**
   * Puts removed content back.
   *
   * @param payload - What to restore, and what to tell the creator.
   * @returns An observable of the audit entry written.
   */
  restoreContent(
    payload: ModerateContentRequest,
  ): Observable<ModerationActionEntry> {
    return this.moderationAction('restore', payload);
  }

  /**
   * Lists the appeals waiting on a decision.
   *
   * @param status - The state to filter to, if any.
   * @returns An observable of the appeals.
   */
  getAppeals(status?: AppealStatus): Observable<ModerationAppeal[]> {
    return this.authenticated(options =>
      this._http.get<ModerationAppeal[]>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/appeals`,
        {
          ...options,
          params: status ? new HttpParams().set('status', status) : undefined,
        },
      ),
    );
  }

  /**
   * Decides an appeal, restoring the content when it is upheld.
   *
   * @param appealId - The appeal.
   * @param payload - The decision and what to say about it.
   * @returns An observable of the decided appeal.
   */
  decideAppeal(
    appealId: string,
    payload: { uphold: boolean; reviewNotes?: string },
  ): Observable<ModerationAppeal> {
    return this.authenticated(options =>
      this._http.post<ModerationAppeal>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/appeals/${appealId}/decide`,
        payload,
        options,
      ),
    );
  }

  /**
   * Builds the URL for one piece of content in the moderation API.
   *
   * @param targetType - The kind of content.
   * @param targetId - The content.
   * @returns The URL.
   */
  private contentUrl(
    targetType: StorytimeTargetType,
    targetId: string,
  ): string {
    return `${API_URLS.STORYTIME_ADMIN_MODERATION}/content/${targetType}/${targetId}`;
  }

  /**
   * Performs a removal or a restoration.
   *
   * @param action - The action path segment.
   * @param payload - What to act on, and what to say about it.
   * @returns An observable of the audit entry written.
   */
  private moderationAction(
    action: string,
    payload: ModerateContentRequest,
  ): Observable<ModerationActionEntry> {
    return this.authenticated(options =>
      this._http.post<ModerationActionEntry>(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/moderation/${action}`,
        payload,
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
