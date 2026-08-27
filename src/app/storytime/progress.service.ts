import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChapterProgress,
  ChapterProgressUpdate,
  LibraryEntry,
  ReaderStoryStatus,
  StoryProgress,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * A reader's own progress through Stories and Chapters.
 *
 * Every call is the caller's own: the server takes the reader from the token,
 * so there is no reader identifier to pass and no way to ask for somebody
 * else's. Progress therefore only exists for a signed-in reader, and each call
 * fails rather than silently doing nothing when there is no token.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the Stories the reader has progress on.
   *
   * Each Story travels with its progress, so a library of a hundred Stories is
   * still one request rather than one per row.
   *
   * @param status - An optional status to narrow the list to.
   * @returns An observable of the reader's library.
   */
  getLibrary(status?: ReaderStoryStatus): Observable<LibraryEntry[]> {
    return this.authenticated(options =>
      this._http.get<LibraryEntry[]>(API_URLS.STORYTIME_PROGRESS, {
        ...options,
        params: status ? new HttpParams().set('status', status) : undefined,
      }),
    );
  }

  /**
   * Reports the reader's progress through one Story.
   *
   * @param storyId - The Story.
   * @returns An observable of the progress.
   */
  getStoryProgress(storyId: string): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.get<StoryProgress>(this.storyUrl(storyId), options),
    );
  }

  /**
   * Reports the reader's progress through one Chapter.
   *
   * This is what makes recording a position worth doing: it is how the reader
   * page puts somebody back where they left off.
   *
   * @param chapterId - The Chapter.
   * @returns An observable of the progress, empty when never opened.
   */
  getChapterProgress(chapterId: string): Observable<ChapterProgress> {
    return this.authenticated(options =>
      this._http.get<ChapterProgress>(
        `${API_URLS.STORYTIME_PROGRESS}/chapters/${chapterId}`,
        options,
      ),
    );
  }

  /**
   * Sets the reader's own status for a Story.
   *
   * @param storyId - The Story.
   * @param status - The chosen status.
   * @returns An observable of the progress after the change.
   */
  setStoryStatus(
    storyId: string,
    status: ReaderStoryStatus,
  ): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.patch<StoryProgress>(
        this.storyUrl(storyId),
        { status },
        options,
      ),
    );
  }

  /**
   * Records how far the reader has got through a Chapter.
   *
   * @param chapterId - The Chapter.
   * @param update - The reported position.
   * @returns An observable of the Story's progress after the update.
   */
  updateChapterProgress(
    chapterId: string,
    update: ChapterProgressUpdate,
  ): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.patch<StoryProgress>(
        `${API_URLS.STORYTIME_PROGRESS}/chapters/${chapterId}`,
        update,
        options,
      ),
    );
  }

  /**
   * Marks a Chapter read or unread.
   *
   * @param chapterId - The Chapter.
   * @param isRead - Whether it is now read.
   * @returns An observable of the Story's progress after the change.
   */
  setChapterRead(
    chapterId: string,
    isRead: boolean,
  ): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.post<StoryProgress>(
        `${API_URLS.STORYTIME_PROGRESS}/chapters/${chapterId}/read`,
        { isRead },
        options,
      ),
    );
  }

  /**
   * Marks every readable Chapter of a Story as read.
   *
   * @param storyId - The Story.
   * @returns An observable of the progress after the change.
   */
  completeStory(storyId: string): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.post<StoryProgress>(
        `${this.storyUrl(storyId)}/complete`,
        {},
        options,
      ),
    );
  }

  /**
   * Discards the reader's progress through a Story.
   *
   * @param storyId - The Story.
   * @returns An observable of the progress after the reset.
   */
  resetStory(storyId: string): Observable<StoryProgress> {
    return this.authenticated(options =>
      this._http.post<StoryProgress>(
        `${this.storyUrl(storyId)}/reset`,
        {},
        options,
      ),
    );
  }

  /**
   * Builds the progress URL for a Story.
   *
   * @param storyId - The Story.
   * @returns The URL.
   */
  private storyUrl(storyId: string): string {
    return `${API_URLS.STORYTIME_PROGRESS}/stories/${storyId}`;
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
