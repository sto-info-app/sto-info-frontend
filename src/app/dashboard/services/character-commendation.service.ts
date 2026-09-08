import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterCommendationProgress,
  CharacterCommendationSummary,
} from '../models/character-commendation.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterCommendationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Fetches commendation progress for a captain, one row per category their
   * allegiance earns.
   *
   * @param characterId - The captain's id.
   * @returns The progress rows, or an error when there is no access token.
   */
  getProgress(
    characterId: string,
  ): Observable<CharacterCommendationProgress[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterCommendationProgress[]>(
      `${API_URLS.COMMENDATION}/character/${characterId}`,
      httpOptions,
    );
  }

  /**
   * Fetches the commendation summary for a captain.
   *
   * @param characterId - The captain's id.
   * @returns The summary, or an error when there is no access token.
   */
  getSummary(characterId: string): Observable<CharacterCommendationSummary> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterCommendationSummary>(
      `${API_URLS.COMMENDATION}/character/${characterId}/summary`,
      httpOptions,
    );
  }

  /**
   * Saves the rank a captain has reached in one commendation category.
   *
   * @param characterId - The captain's id.
   * @param commendationId - The commendation category id.
   * @param currentRank - The rank reached, 0 to 4.
   * @returns The saved progress row, or an error when there is no access token.
   */
  updateProgress(
    characterId: string,
    commendationId: string,
    currentRank: number,
  ): Observable<CharacterCommendationProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<CharacterCommendationProgress>(
      `${API_URLS.COMMENDATION}/character/${characterId}/commendation/${commendationId}`,
      { currentRank },
      httpOptions,
    );
  }
}
