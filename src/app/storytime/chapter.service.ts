import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChapterRequest,
  ChapterSummary,
  ChapterWithNavigation,
  ManagedChapter,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading Chapters, and managing the ones in Stories the caller owns.
 *
 * Reading goes through the Story slug, mirroring the URL a reader sees and the
 * way the server gates access: a Chapter is only reachable through a Story
 * that is itself readable.
 */
@Injectable({
  providedIn: 'root',
})
export class ChapterService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists the readable Chapters of a published Story.
   *
   * @param storySlug - The Story slug.
   * @returns An observable of the Chapter summaries.
   */
  getChapters(storySlug: string): Observable<ChapterSummary[]> {
    return this._http.get<ChapterSummary[]>(this.publicUrl(storySlug));
  }

  /**
   * Reads a Chapter, with the links either side of it.
   *
   * @param storySlug - The Story slug.
   * @param chapterSlug - The Chapter slug.
   * @returns An observable of the Chapter and its neighbours.
   */
  getChapter(
    storySlug: string,
    chapterSlug: string,
  ): Observable<ChapterWithNavigation> {
    return this._http.get<ChapterWithNavigation>(
      `${this.publicUrl(storySlug)}/${encodeURIComponent(chapterSlug)}`,
    );
  }

  // ----- Managing -----

  /**
   * Lists every Chapter of a Story the caller owns.
   *
   * @param storyId - The Story.
   * @returns An observable of the Chapters.
   */
  getMyChapters(storyId: string): Observable<ManagedChapter[]> {
    return this.authenticated(options =>
      this._http.get<ManagedChapter[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/chapters`,
        options,
      ),
    );
  }

  /**
   * Retrieves a Chapter for editing.
   *
   * @param chapterId - The Chapter.
   * @returns An observable of the Chapter.
   */
  getMyChapter(chapterId: string): Observable<ManagedChapter> {
    return this.authenticated(options =>
      this._http.get<ManagedChapter>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}`,
        options,
      ),
    );
  }

  /**
   * Creates a Chapter in a Story the caller owns.
   *
   * @param storyId - The Story to add to.
   * @param payload - The Chapter to create.
   * @returns An observable of the created Chapter.
   */
  createChapter(
    storyId: string,
    payload: ChapterRequest,
  ): Observable<ManagedChapter> {
    return this.authenticated(options =>
      this._http.post<ManagedChapter>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/chapters`,
        payload,
        options,
      ),
    );
  }

  /**
   * Updates a Chapter.
   *
   * @param chapterId - The Chapter to update.
   * @param payload - The changes, including the version last seen.
   * @returns An observable of the updated Chapter.
   */
  updateChapter(
    chapterId: string,
    payload: ChapterRequest,
  ): Observable<ManagedChapter> {
    return this.authenticated(options =>
      this._http.patch<ManagedChapter>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Publishes a Chapter.
   *
   * @param chapterId - The Chapter to publish.
   * @returns An observable of the published Chapter.
   */
  publishChapter(chapterId: string): Observable<ManagedChapter> {
    return this.action(chapterId, 'publish');
  }

  /**
   * Withdraws a Chapter from publication.
   *
   * @param chapterId - The Chapter to unpublish.
   * @returns An observable of the unpublished Chapter.
   */
  unpublishChapter(chapterId: string): Observable<ManagedChapter> {
    return this.action(chapterId, 'unpublish');
  }

  /**
   * Schedules a Chapter to publish automatically.
   *
   * @param chapterId - The Chapter to schedule.
   * @param publishAt - When it should publish, as a UTC instant.
   * @returns An observable of the scheduled Chapter.
   */
  scheduleChapter(
    chapterId: string,
    publishAt: Date,
  ): Observable<ManagedChapter> {
    return this.authenticated(options =>
      this._http.post<ManagedChapter>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}/schedule`,
        { publishAt: publishAt.toISOString() },
        options,
      ),
    );
  }

  /**
   * Reorders the Chapters of a Story.
   *
   * @param storyId - The Story.
   * @param chapterIds - Every Chapter, in reading order.
   * @returns An observable of the reordered Chapters.
   */
  reorderChapters(
    storyId: string,
    chapterIds: string[],
  ): Observable<ManagedChapter[]> {
    return this.authenticated(options =>
      this._http.post<ManagedChapter[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/chapters/reorder`,
        { chapterIds },
        options,
      ),
    );
  }

  /**
   * Deletes a Chapter.
   *
   * @param chapterId - The Chapter to delete.
   * @returns An observable that completes when the Chapter is deleted.
   */
  deleteChapter(chapterId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}`,
        options,
      ),
    );
  }

  /**
   * Builds the public Chapter collection URL for a Story.
   *
   * @param storySlug - The Story slug.
   * @returns The URL.
   */
  private publicUrl(storySlug: string): string {
    return `${API_URLS.STORYTIME_STORIES}/${encodeURIComponent(storySlug)}/chapters`;
  }

  /**
   * Performs a state-changing action on a Chapter.
   *
   * @param chapterId - The Chapter to act on.
   * @param action - The action path segment.
   * @returns An observable of the resulting Chapter.
   */
  private action(
    chapterId: string,
    action: string,
  ): Observable<ManagedChapter> {
    return this.authenticated(options =>
      this._http.post<ManagedChapter>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}/${action}`,
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
}
