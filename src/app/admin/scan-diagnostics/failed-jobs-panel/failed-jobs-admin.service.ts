import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  DiscardUnretryableResult,
  FailedJobPage,
  FailedJobQueue,
  RetryAllResult,
} from 'src/app/models/failed-jobs.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The site admins' failed background jobs (FC-042): read, retry and
 * discard, each change with a reason for the site admin log. The server
 * refuses all of it without the ADMIN role, whatever the client believes,
 * and logs every read.
 */
@Injectable({
  providedIn: 'root',
})
export class FailedJobsAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * A page of failed jobs.
   *
   * @param queue - One queue only, or null for every one.
   * @param page - Which page, from 1.
   * @returns The page.
   */
  list(queue: FailedJobQueue | null, page: number): Observable<FailedJobPage> {
    let params = new HttpParams().set('page', page);

    if (queue !== null) {
      params = params.set('queue', queue);
    }

    return this.authenticated(options =>
      this._http.get<FailedJobPage>(API_URLS.FILE_SCANNING_ADMIN_FAILED_JOBS, {
        ...options,
        params,
      }),
    );
  }

  /**
   * Retries one failed job.
   *
   * @param queue - Its queue.
   * @param jobId - The job.
   * @param reason - Why, for the site admin log.
   * @returns Nothing, once sent round again.
   */
  retry(
    queue: FailedJobQueue,
    jobId: string,
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.jobUrl(queue, jobId)}/retry`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Discards one failed job, whether or not a retry could help it.
   *
   * @param queue - Its queue.
   * @param jobId - The job.
   * @param reason - Why, for the site admin log.
   * @returns Nothing, once removed.
   */
  discard(
    queue: FailedJobQueue,
    jobId: string,
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.jobUrl(queue, jobId)}/discard`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Retries every failed job a retry can help.
   *
   * @param queue - One queue only, or null for every one.
   * @param reason - Why, for the site admin log.
   * @returns What was retried and what was left alone.
   */
  retryAll(
    queue: FailedJobQueue | null,
    reason: string,
  ): Observable<RetryAllResult> {
    return this.authenticated(options =>
      this._http.post<RetryAllResult>(
        `${API_URLS.FILE_SCANNING_ADMIN_FAILED_JOBS}/retry-all`,
        this.bulkBody(queue, reason),
        options,
      ),
    );
  }

  /**
   * Discards every failed job a retry cannot help.
   *
   * @param queue - One queue only, or null for every one.
   * @param reason - Why, for the site admin log.
   * @returns What was discarded and what was kept.
   */
  discardUnretryable(
    queue: FailedJobQueue | null,
    reason: string,
  ): Observable<DiscardUnretryableResult> {
    return this.authenticated(options =>
      this._http.post<DiscardUnretryableResult>(
        `${API_URLS.FILE_SCANNING_ADMIN_FAILED_JOBS}/discard-unretryable`,
        this.bulkBody(queue, reason),
        options,
      ),
    );
  }

  /**
   * Where one failed job is addressed.
   *
   * @param queue - Its queue.
   * @param jobId - The job.
   * @returns Its URL.
   */
  private jobUrl(queue: FailedJobQueue, jobId: string): string {
    return (
      `${API_URLS.FILE_SCANNING_ADMIN_FAILED_JOBS}/` +
      `${encodeURIComponent(queue)}/${encodeURIComponent(jobId)}`
    );
  }

  /**
   * The body of a bulk action: the queue only when one was chosen.
   *
   * @param queue - One queue, or null for every one.
   * @param reason - Why.
   * @returns The body.
   */
  private bulkBody(
    queue: FailedJobQueue | null,
    reason: string,
  ): { reason: string; queue?: FailedJobQueue } {
    return queue === null ? { reason } : { reason, queue };
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
