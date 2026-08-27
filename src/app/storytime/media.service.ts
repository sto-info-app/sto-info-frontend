import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AddChapterMediaRequest,
  ChapterMedia,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The videos a Chapter embeds.
 *
 * Reading goes through the Story and Chapter slugs, mirroring the URL a reader
 * sees and the way the server gates access: a video is only reachable through
 * a Chapter that is itself readable.
 */
@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the videos on a published Chapter.
   *
   * Returns an empty list rather than failing when embedding is switched off,
   * because a Chapter with its videos hidden is still worth reading.
   *
   * @param storySlug - The Story slug.
   * @param chapterSlug - The Chapter slug.
   * @returns An observable of the videos, in order.
   */
  getChapterMedia(
    storySlug: string,
    chapterSlug: string,
  ): Observable<ChapterMedia[]> {
    return this._http.get<ChapterMedia[]>(
      `${API_URLS.STORYTIME_STORIES}/${encodeURIComponent(storySlug)}/chapters/${encodeURIComponent(chapterSlug)}/media`,
    );
  }

  /**
   * Lists the videos on a Chapter the caller may edit.
   *
   * @param chapterId - The Chapter.
   * @returns An observable of the videos, in order.
   */
  getMyChapterMedia(chapterId: string): Observable<ChapterMedia[]> {
    return this.authenticated(options =>
      this._http.get<ChapterMedia[]>(this.manageUrl(chapterId), options),
    );
  }

  /**
   * Adds a video to a Chapter.
   *
   * @param chapterId - The Chapter.
   * @param payload - The share URL and how to present it.
   * @returns An observable of the saved video.
   */
  addMedia(
    chapterId: string,
    payload: AddChapterMediaRequest,
  ): Observable<ChapterMedia> {
    return this.authenticated(options =>
      this._http.post<ChapterMedia>(
        this.manageUrl(chapterId),
        payload,
        options,
      ),
    );
  }

  /**
   * Changes how a video is presented.
   *
   * @param mediaId - The video.
   * @param payload - The changes.
   * @returns An observable of the updated video.
   */
  updateMedia(
    mediaId: string,
    payload: Omit<AddChapterMediaRequest, 'url'>,
  ): Observable<ChapterMedia> {
    return this.authenticated(options =>
      this._http.patch<ChapterMedia>(
        `${API_URLS.STORYTIME_MANAGE_MEDIA}/${mediaId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Reorders the videos on a Chapter.
   *
   * @param chapterId - The Chapter.
   * @param mediaIds - Every video, in order.
   * @returns An observable of the videos in their new order.
   */
  reorderMedia(
    chapterId: string,
    mediaIds: string[],
  ): Observable<ChapterMedia[]> {
    return this.authenticated(options =>
      this._http.post<ChapterMedia[]>(
        `${this.manageUrl(chapterId)}/reorder`,
        { mediaIds },
        options,
      ),
    );
  }

  /**
   * Removes a video from a Chapter.
   *
   * @param mediaId - The video.
   * @returns An observable that completes when the video is removed.
   */
  removeMedia(mediaId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_MANAGE_MEDIA}/${mediaId}`,
        options,
      ),
    );
  }

  /**
   * Builds the creator media URL for a Chapter.
   *
   * @param chapterId - The Chapter.
   * @returns The URL.
   */
  private manageUrl(chapterId: string): string {
    return `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}/media`;
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
