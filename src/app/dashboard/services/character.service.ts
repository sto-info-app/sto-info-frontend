import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterSortBy,
  CharacterSortOrder,
} from 'src/app/shared/utils/character-list.utils';
import {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../models/character.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Fetches all characters for the current user.
   * @returns An observable of character array.
   */
  getCharacters(): Observable<Character[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<Character[]>(API_URLS.CHARACTER, httpOptions);
  }

  /**
   * Fetches all characters for a specific account.
   *
   * Pinned captains lead the list whichever ordering is asked for.
   *
   * @param accountId The account ID.
   * @param sortBy Field to order by. Omit to take the API's default of handle.
   * @param sortOrder Direction to order in. Omit to take the API's default of
   * ascending.
   * @returns An observable of character array.
   */
  getCharactersByAccount(
    accountId: string,
    sortBy?: CharacterSortBy,
    sortOrder?: CharacterSortOrder,
  ): Observable<Character[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    let params = new HttpParams().set('accountId', accountId);
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }
    return this._http.get<Character[]>(API_URLS.CHARACTER, {
      ...httpOptions,
      params,
    });
  }

  /**
   * Pins or unpins one of the current user's captains, so that it leads the
   * account's own captain list.
   *
   * @param id The character ID.
   * @param pinned True to pin the captain, false to unpin it.
   * @returns An observable of the updated character.
   */
  setCharacterPinned(id: string, pinned: boolean): Observable<Character> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<Character>(
      `${API_URLS.CHARACTER}/${id}/pin`,
      { pinned },
      httpOptions,
    );
  }

  /**
   * Fetches a specific character by ID.
   * @param id The character ID.
   * @returns An observable of the character.
   */
  getCharacter(id: string): Observable<Character> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<Character>(
      `${API_URLS.CHARACTER}/${id}`,
      httpOptions,
    );
  }

  /**
   * Creates a new character.
   * @param character The character data.
   * @returns An observable of the created character.
   */
  createCharacter(character: CreateCharacterRequest): Observable<Character> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.post<Character>(
      API_URLS.CHARACTER,
      character,
      httpOptions,
    );
  }

  /**
   * Updates an existing character.
   * @param id The character ID.
   * @param character The updated character data.
   * @returns An observable of the updated character.
   */
  updateCharacter(
    id: string,
    character: UpdateCharacterRequest,
  ): Observable<Character> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<Character>(
      `${API_URLS.CHARACTER}/${id}`,
      character,
      httpOptions,
    );
  }

  /**
   * Updates a character's profile picture.
   * @param characterId The character ID.
   * @param profilePicForm The form data containing the image.
   * @returns An observable of the updated character.
   */
  updateCharacterProfilePic(
    characterId: string,
    profilePicForm: FormData,
  ): Observable<Character> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    // Remove the Content-Type header if it exists
    if (httpOptions?.headers.has('Content-Type')) {
      httpOptions.headers = httpOptions.headers.delete('Content-Type');
    }

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.post<Character>(
      `${API_URLS.CHARACTER}/${characterId}/profile-image`,
      profilePicForm,
      httpOptions,
    );
  }

  /**
   * Deletes a character.
   * @param id The character ID.
   * @returns An observable of the deletion result.
   */
  deleteCharacter(id: string): Observable<void> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.delete<void>(`${API_URLS.CHARACTER}/${id}`, httpOptions);
  }
}
