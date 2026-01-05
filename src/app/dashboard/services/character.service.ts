import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../models/character.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches all characters for the current user.
   * @returns An observable of character array.
   */
  getCharacters(): Observable<Character[]> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<Character[]>(API_URLS.CHARACTER, httpOptions);
  }

  /**
   * Fetches all characters for a specific account.
   * @param accountId The account ID.
   * @returns An observable of character array.
   */
  getCharactersByAccount(accountId: string): Observable<Character[]> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    const params = new HttpParams().set('accountId', accountId);
    return this.http.get<Character[]>(API_URLS.CHARACTER, {
      ...httpOptions,
      params,
    });
  }

  /**
   * Fetches a specific character by ID.
   * @param id The character ID.
   * @returns An observable of the character.
   */
  getCharacter(id: string): Observable<Character> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<Character>(`${API_URLS.CHARACTER}/${id}`, httpOptions);
  }

  /**
   * Creates a new character.
   * @param character The character data.
   * @returns An observable of the created character.
   */
  createCharacter(character: CreateCharacterRequest): Observable<Character> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<Character>(
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
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.put<Character>(
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
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();

    // Remove the Content-Type header if it exists
    if (httpOptions?.headers.has('Content-Type')) {
      httpOptions.headers = httpOptions.headers.delete('Content-Type');
    }

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this.http.post<Character>(
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
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.delete<void>(`${API_URLS.CHARACTER}/${id}`, httpOptions);
  }
}
