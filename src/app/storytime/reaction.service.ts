import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReactionSummary,
  StorytimeReaction,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { targetTypeSegment } from './target-type.utility';

/**
 * What readers think of Storytime content.
 *
 * Reading a summary needs no account, so that a signed-out reader sees the
 * same rating as everybody else. Leaving one does: the server takes the reader
 * from the token, which is what stops one person voting twice.
 */
@Injectable({
  providedIn: 'root',
})
export class ReactionService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads how a thing stands.
   *
   * @param targetType - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of its counts, and what this reader chose.
   */
  getSummary(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<ReactionSummary> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    // Signed out is a legitimate way to read a rating, so the token is
    // attached when there is one rather than required.
    return this._http.get<ReactionSummary>(
      `${API_URLS.STORYTIME_REACTIONS}/${targetTypeSegment(
        targetType,
      )}/${targetId}`,
      options ?? {},
    );
  }

  /**
   * Records what the reader thinks of something.
   *
   * Sending the same reaction again takes it back, because that is what a
   * pressed button means when it is pressed a second time.
   *
   * @param targetType - What kind of thing.
   * @param targetId - The thing.
   * @param reaction - What they thought of it.
   * @returns An observable of how the thing now stands.
   */
  react(
    targetType: StorytimeTargetType,
    targetId: string,
    reaction: StorytimeReaction,
  ): Observable<ReactionSummary> {
    return this.authenticated(options =>
      this._http.post<ReactionSummary>(
        API_URLS.STORYTIME_REACTIONS,
        { targetType, targetId, reaction },
        options,
      ),
    );
  }

  /**
   * Takes back whatever the reader left.
   *
   * @param targetType - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of how the thing now stands.
   */
  removeReaction(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<ReactionSummary> {
    return this.authenticated(options =>
      this._http.delete<ReactionSummary>(
        `${API_URLS.STORYTIME_REACTIONS}/${targetTypeSegment(
          targetType,
        )}/${targetId}`,
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
