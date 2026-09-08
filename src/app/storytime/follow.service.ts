import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FeedEntry,
  FollowState,
  FollowTargetKind,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Following creators, Stories and Arcs, and the feed that comes of it.
 *
 * Everything here needs sign-in: a follow is a relationship between a person
 * and something, and a feed is one person's. Following is idempotent in both
 * directions, so a button may report the state it wants without checking
 * first.
 */
@Injectable({
  providedIn: 'root',
})
export class FollowService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reports whether the reader follows something.
   *
   * @param kind - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of whether they follow it, and how many others do.
   */
  getFollowState(
    kind: FollowTargetKind,
    targetId: string,
  ): Observable<FollowState> {
    return this.authenticated(options =>
      this._http.get<FollowState>(
        `${API_URLS.STORYTIME_FOLLOWS}/${kind}/${targetId}`,
        options,
      ),
    );
  }

  /**
   * Follows something.
   *
   * @param kind - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of the state to render.
   */
  follow(kind: FollowTargetKind, targetId: string): Observable<FollowState> {
    return this.authenticated(options =>
      this._http.post<FollowState>(
        `${API_URLS.STORYTIME_FOLLOWS}/${kind}/${targetId}`,
        {},
        options,
      ),
    );
  }

  /**
   * Stops following something.
   *
   * @param kind - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of the state to render.
   */
  unfollow(kind: FollowTargetKind, targetId: string): Observable<FollowState> {
    return this.authenticated(options =>
      this._http.delete<FollowState>(
        `${API_URLS.STORYTIME_FOLLOWS}/${kind}/${targetId}`,
        options,
      ),
    );
  }

  /**
   * Reads the reader's feed.
   *
   * @param page - The page wanted.
   * @returns An observable of what the people and work they follow have done.
   */
  getFeed(page = 1): Observable<FeedEntry[]> {
    return this.authenticated(options =>
      this._http.get<FeedEntry[]>(API_URLS.STORYTIME_FEED, {
        ...options,
        params: new HttpParams().set('page', page),
      }),
    );
  }

  /**
   * Counts what the reader has not seen.
   *
   * @returns An observable of how many unseen items they may read.
   */
  getUnreadCount(): Observable<{ unread: number }> {
    return this.authenticated(options =>
      this._http.get<{ unread: number }>(
        `${API_URLS.STORYTIME_FEED}/unread`,
        options,
      ),
    );
  }

  /**
   * Marks the reader's feed as seen.
   *
   * @returns An observable that completes when the feed is marked as read.
   */
  markFeedRead(): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(`${API_URLS.STORYTIME_FEED}/read`, {}, options),
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
