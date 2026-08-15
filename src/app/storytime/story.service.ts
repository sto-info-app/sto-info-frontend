import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ManagedStory,
  PaginatedStories,
  Story,
  StoryQuery,
  StoryRequest,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading Stories, and managing the ones the signed-in user owns.
 *
 * The public reads need no token; everything under `manage` does, and fails
 * fast without one rather than sending a request that is certain to be refused.
 */
@Injectable({
  providedIn: 'root',
})
export class StoryService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists published Stories.
   *
   * @param query - Paging and filtering options.
   * @returns An observable of the page of Stories.
   */
  getStories(query: StoryQuery = {}): Observable<PaginatedStories> {
    return this._http.get<PaginatedStories>(API_URLS.STORYTIME_STORIES, {
      params: this.buildParams(query),
    });
  }

  /**
   * Retrieves a published Story by slug.
   *
   * @param slug - The Story slug.
   * @returns An observable of the Story.
   */
  getStory(slug: string): Observable<Story> {
    return this._http.get<Story>(
      `${API_URLS.STORYTIME_STORIES}/${encodeURIComponent(slug)}`,
    );
  }

  // ----- Managing -----

  /**
   * Lists the Stories the signed-in user owns.
   *
   * @returns An observable of the caller's Stories.
   */
  getMyStories(): Observable<ManagedStory[]> {
    return this.authenticated(options =>
      this._http.get<ManagedStory[]>(
        API_URLS.STORYTIME_MANAGE_STORIES,
        options,
      ),
    );
  }

  /**
   * Retrieves one of the caller's Stories for editing.
   *
   * @param storyId - The Story to retrieve.
   * @returns An observable of the Story.
   */
  getMyStory(storyId: string): Observable<ManagedStory> {
    return this.authenticated(options =>
      this._http.get<ManagedStory>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}`,
        options,
      ),
    );
  }

  /**
   * Creates a Story.
   *
   * @param payload - The Story to create.
   * @returns An observable of the created Story.
   */
  createStory(payload: StoryRequest): Observable<ManagedStory> {
    return this.authenticated(options =>
      this._http.post<ManagedStory>(
        API_URLS.STORYTIME_MANAGE_STORIES,
        payload,
        options,
      ),
    );
  }

  /**
   * Updates a Story the caller owns.
   *
   * @param storyId - The Story to update.
   * @param payload - The changes, including the version last seen.
   * @returns An observable of the updated Story.
   */
  updateStory(
    storyId: string,
    payload: StoryRequest,
  ): Observable<ManagedStory> {
    return this.authenticated(options =>
      this._http.patch<ManagedStory>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Publishes a Story the caller owns.
   *
   * @param storyId - The Story to publish.
   * @returns An observable of the published Story.
   */
  publishStory(storyId: string): Observable<ManagedStory> {
    return this.action(storyId, 'publish');
  }

  /**
   * Withdraws a Story from publication.
   *
   * @param storyId - The Story to unpublish.
   * @returns An observable of the unpublished Story.
   */
  unpublishStory(storyId: string): Observable<ManagedStory> {
    return this.action(storyId, 'unpublish');
  }

  /**
   * Archives a Story.
   *
   * @param storyId - The Story to archive.
   * @returns An observable of the archived Story.
   */
  archiveStory(storyId: string): Observable<ManagedStory> {
    return this.action(storyId, 'archive');
  }

  /**
   * Reorders the caller's Stories.
   *
   * @param storyIds - Every Story the caller owns, in the order they want.
   * @returns An observable of the reordered Stories.
   */
  reorderStories(storyIds: string[]): Observable<ManagedStory[]> {
    return this.authenticated(options =>
      this._http.post<ManagedStory[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/reorder`,
        { storyIds },
        options,
      ),
    );
  }

  /**
   * Deletes a Story the caller owns.
   *
   * @param storyId - The Story to delete.
   * @returns An observable that completes when the Story is deleted.
   */
  deleteStory(storyId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}`,
        options,
      ),
    );
  }

  /**
   * Performs a state-changing action on a Story.
   *
   * @param storyId - The Story to act on.
   * @param action - The action path segment.
   * @returns An observable of the resulting Story.
   */
  private action(storyId: string, action: string): Observable<ManagedStory> {
    return this.authenticated(options =>
      this._http.post<ManagedStory>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/${action}`,
        {},
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

  /**
   * Builds the listing query string, omitting anything unset.
   *
   * @param query - The Story query.
   * @returns The HTTP params to send.
   */
  private buildParams(query: StoryQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
