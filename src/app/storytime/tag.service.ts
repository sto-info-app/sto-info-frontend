import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  StorytimeTag,
  StorytimeTagCategory,
  TagRequest,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The Storytime tag vocabulary, and the tags on content.
 *
 * Reading needs no account: a tag is a filter link, and somebody following one
 * has to be able to see what it means. Changing the vocabulary is
 * administrators only, and tagging a Story needs whatever editing it needs —
 * both enforced by the server.
 */
@Injectable({
  providedIn: 'root',
})
export class TagService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the vocabulary.
   *
   * @param category - The category to limit to, if any.
   * @returns An observable of the tags, by category then order.
   */
  getTags(category?: StorytimeTagCategory): Observable<StorytimeTag[]> {
    return this._http.get<StorytimeTag[]>(API_URLS.STORYTIME_TAGS, {
      params: category ? new HttpParams().set('category', category) : undefined,
    });
  }

  /**
   * Reads the tags on a Story.
   *
   * @param storyId - The Story.
   * @returns An observable of its tags.
   */
  getStoryTags(storyId: string): Observable<StorytimeTag[]> {
    return this._http.get<StorytimeTag[]>(
      `${API_URLS.STORYTIME_STORIES}/${storyId}/tags`,
    );
  }

  /**
   * Sets the tags on a Story, replacing whatever it had.
   *
   * @param storyId - The Story.
   * @param tagIds - The tags it should carry.
   * @returns An observable of the tags it now carries.
   */
  setStoryTags(storyId: string, tagIds: string[]): Observable<StorytimeTag[]> {
    return this.authenticated(options =>
      this._http.put<StorytimeTag[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/tags`,
        { tagIds },
        options,
      ),
    );
  }

  /**
   * Reads the tags on an Arc.
   *
   * @param arcId - The Arc.
   * @returns An observable of its tags.
   */
  getArcTags(arcId: string): Observable<StorytimeTag[]> {
    return this._http.get<StorytimeTag[]>(
      `${API_URLS.STORYTIME_ARCS}/${arcId}/tags`,
    );
  }

  /**
   * Sets the tags on an Arc, replacing whatever it had.
   *
   * @param arcId - The Arc.
   * @param tagIds - The tags it should carry.
   * @returns An observable of the tags it now carries.
   */
  setArcTags(arcId: string, tagIds: string[]): Observable<StorytimeTag[]> {
    return this.authenticated(options =>
      this._http.put<StorytimeTag[]>(
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${arcId}/tags`,
        { tagIds },
        options,
      ),
    );
  }

  /**
   * Adds a tag to the vocabulary.
   *
   * @param payload - The tag to add.
   * @returns An observable of the tag.
   */
  createTag(payload: TagRequest): Observable<StorytimeTag> {
    return this.authenticated(options =>
      this._http.post<StorytimeTag>(
        API_URLS.STORYTIME_ADMIN_TAGS,
        payload,
        options,
      ),
    );
  }

  /**
   * Changes a tag.
   *
   * @param tagId - The tag.
   * @param payload - The changes.
   * @returns An observable of the tag after the change.
   */
  updateTag(tagId: string, payload: TagRequest): Observable<StorytimeTag> {
    return this.authenticated(options =>
      this._http.patch<StorytimeTag>(
        `${API_URLS.STORYTIME_ADMIN_TAGS}/${tagId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Removes a tag from the vocabulary.
   *
   * @param tagId - The tag.
   * @returns An observable that completes when the tag is removed.
   */
  deleteTag(tagId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_ADMIN_TAGS}/${tagId}`,
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
