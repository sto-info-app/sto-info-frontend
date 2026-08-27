import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CommentRequest,
  StorytimeComment,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Comments on Stories, Chapters and Arcs.
 *
 * Reading a thread needs no account. Everything that changes one does, and who
 * may do what is the server's to decide: an author may edit or delete their
 * own, the owner of the content may hide any of them from their own page, and
 * an administrator may remove one under the content policy.
 */
@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads the thread on something.
   *
   * @param targetType - What kind of thing.
   * @param targetId - The thing.
   * @returns An observable of its comments, oldest first, replies included.
   */
  getComments(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<StorytimeComment[]> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    // The token is attached when there is one so that a reader sees their own
    // deleted comment as theirs, rather than as an anonymous gap.
    return this._http.get<StorytimeComment[]>(
      `${API_URLS.STORYTIME_COMMENTS}/${targetType}/${targetId}`,
      options ?? {},
    );
  }

  /**
   * Posts a comment, or a reply to one.
   *
   * @param payload - What is being said, and what about.
   * @returns An observable of the comment.
   */
  postComment(payload: CommentRequest): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.post<StorytimeComment>(
        API_URLS.STORYTIME_COMMENTS,
        payload,
        options,
      ),
    );
  }

  /**
   * Changes what a comment says.
   *
   * @param commentId - The comment.
   * @param body - What it should say.
   * @returns An observable of the comment after the change.
   */
  updateComment(commentId: string, body: string): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.patch<StorytimeComment>(
        `${API_URLS.STORYTIME_COMMENTS}/${commentId}`,
        { body },
        options,
      ),
    );
  }

  /**
   * Takes back a comment the reader wrote.
   *
   * @param commentId - The comment.
   * @returns An observable of the comment, now silenced.
   */
  deleteComment(commentId: string): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.delete<StorytimeComment>(
        `${API_URLS.STORYTIME_COMMENTS}/${commentId}`,
        options,
      ),
    );
  }

  /**
   * Hides a comment from the content it is on.
   *
   * For the owner of the Story, Chapter or Arc, not its author.
   *
   * @param commentId - The comment.
   * @returns An observable of the comment, now hidden.
   */
  hideComment(commentId: string): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.post<StorytimeComment>(
        `${API_URLS.STORYTIME_COMMENTS}/${commentId}/hide`,
        {},
        options,
      ),
    );
  }

  /**
   * Puts a hidden comment back.
   *
   * @param commentId - The comment.
   * @returns An observable of the comment, visible again.
   */
  unhideComment(commentId: string): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.post<StorytimeComment>(
        `${API_URLS.STORYTIME_COMMENTS}/${commentId}/unhide`,
        {},
        options,
      ),
    );
  }

  /**
   * Removes a comment under the content policy.
   *
   * For administrators. The message is what the author is told, word for word.
   *
   * @param commentId - The comment.
   * @param message - What the author is told.
   * @returns An observable of the comment, now removed.
   */
  removeComment(
    commentId: string,
    message: string,
  ): Observable<StorytimeComment> {
    return this.authenticated(options =>
      this._http.post<StorytimeComment>(
        `${API_URLS.STORYTIME_COMMENTS}/${commentId}/remove`,
        { message },
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
