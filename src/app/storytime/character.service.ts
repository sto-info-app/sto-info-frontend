import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AppearanceRequest,
  Character,
  CharacterRequest,
  CharacterWithAppearances,
  ChapterAppearance,
  CopiedCharacter,
  CopyableCharacterStory,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading a Story's cast, and managing the cast of Stories the caller owns.
 *
 * Reading goes through the Story slug, mirroring the URL a reader sees and the
 * way the server gates access: a Character is only reachable through a Story
 * that is itself readable.
 */
@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists the cast of a published Story.
   *
   * @param storySlug - The Story slug.
   * @returns An observable of the cast, in display order.
   */
  getCharacters(storySlug: string): Observable<Character[]> {
    return this._http.get<Character[]>(this.publicUrl(storySlug));
  }

  /**
   * Reads one Character, with the Chapters they appear in.
   *
   * @param storySlug - The Story slug.
   * @param characterSlug - The Character slug.
   * @returns An observable of the Character and their appearances.
   */
  getCharacter(
    storySlug: string,
    characterSlug: string,
  ): Observable<CharacterWithAppearances> {
    return this._http.get<CharacterWithAppearances>(
      `${this.publicUrl(storySlug)}/${encodeURIComponent(characterSlug)}`,
    );
  }

  // ----- Managing -----

  /**
   * Lists the cast of a Story the caller owns.
   *
   * @param storyId - The Story.
   * @returns An observable of the cast.
   */
  getMyCharacters(storyId: string): Observable<ManagedCharacter[]> {
    return this.authenticated(options =>
      this._http.get<ManagedCharacter[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/characters`,
        options,
      ),
    );
  }

  /**
   * Retrieves a Character for editing.
   *
   * @param characterId - The Character.
   * @returns An observable of the Character.
   */
  getMyCharacter(characterId: string): Observable<ManagedCharacter> {
    return this.authenticated(options =>
      this._http.get<ManagedCharacter>(
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${characterId}`,
        options,
      ),
    );
  }

  /**
   * Creates a Character in a Story the caller owns.
   *
   * @param storyId - The Story to add to.
   * @param payload - The Character to create.
   * @returns An observable of the created Character.
   */
  createCharacter(
    storyId: string,
    payload: CharacterRequest,
  ): Observable<ManagedCharacter> {
    return this.authenticated(options =>
      this._http.post<ManagedCharacter>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/characters`,
        payload,
        options,
      ),
    );
  }

  /**
   * Lists the Characters the caller could copy into a Story (sc-1483).
   *
   * @param storyId - The Story the copy would join.
   * @returns An observable of the caller's other Stories and their casts.
   */
  getCopyableCharacters(storyId: string): Observable<CopyableCharacterStory[]> {
    return this.authenticated(options =>
      this._http.get<CopyableCharacterStory[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/characters/copyable`,
        options,
      ),
    );
  }

  /**
   * Copies a Character from another of the caller's Stories into this one.
   *
   * @param storyId - The Story to copy into.
   * @param sourceCharacterId - The Character to copy.
   * @returns An observable of the copy, and the portrait it left behind.
   */
  copyCharacter(
    storyId: string,
    sourceCharacterId: string,
  ): Observable<CopiedCharacter> {
    return this.authenticated(options =>
      this._http.post<CopiedCharacter>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/characters/copy`,
        { sourceCharacterId },
        options,
      ),
    );
  }

  /**
   * Fetches an original portrait from the CDN, to save as a file.
   *
   * Asked for without the access token: the picture is public, and the CDN
   * serves it to any origin.
   *
   * @param url - The portrait as it was uploaded.
   * @returns An observable of the picture.
   */
  downloadOriginalPortrait(url: string): Observable<Blob> {
    return this._http.get(url, { responseType: 'blob' });
  }

  /**
   * Updates a Character.
   *
   * @param characterId - The Character to update.
   * @param payload - The changes, including the version last seen.
   * @returns An observable of the updated Character.
   */
  updateCharacter(
    characterId: string,
    payload: CharacterRequest,
  ): Observable<ManagedCharacter> {
    return this.authenticated(options =>
      this._http.patch<ManagedCharacter>(
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${characterId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Reorders the cast of a Story.
   *
   * @param storyId - The Story.
   * @param characterIds - Every Character, in display order.
   * @returns An observable of the cast in its new order.
   */
  reorderCharacters(
    storyId: string,
    characterIds: string[],
  ): Observable<ManagedCharacter[]> {
    return this.authenticated(options =>
      this._http.post<ManagedCharacter[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/characters/reorder`,
        { characterIds },
        options,
      ),
    );
  }

  /**
   * Deletes a Character.
   *
   * @param characterId - The Character to delete.
   * @returns An observable that completes when the Character is deleted.
   */
  deleteCharacter(characterId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${characterId}`,
        options,
      ),
    );
  }

  // ----- Appearances -----

  /**
   * Lists who appears in a Chapter the caller owns.
   *
   * @param chapterId - The Chapter.
   * @returns An observable of the Chapter's cast.
   */
  getAppearances(chapterId: string): Observable<ChapterAppearance[]> {
    return this.authenticated(options =>
      this._http.get<ChapterAppearance[]>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}/characters`,
        options,
      ),
    );
  }

  /**
   * Sets who appears in a Chapter.
   *
   * The whole cast is sent rather than individual additions and removals: the
   * editor shows it as a set of ticks, so saving means "these, and only
   * these". An empty list clears it.
   *
   * @param chapterId - The Chapter.
   * @param appearances - The Characters appearing, in order.
   * @returns An observable of the Chapter's cast as saved.
   */
  setAppearances(
    chapterId: string,
    appearances: AppearanceRequest[],
  ): Observable<ChapterAppearance[]> {
    return this.authenticated(options =>
      this._http.post<ChapterAppearance[]>(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${chapterId}/characters`,
        { appearances },
        options,
      ),
    );
  }

  /**
   * Builds the public Character collection URL for a Story.
   *
   * @param storySlug - The Story slug.
   * @returns The URL.
   */
  private publicUrl(storySlug: string): string {
    return `${API_URLS.STORYTIME_STORIES}/${encodeURIComponent(storySlug)}/characters`;
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
