import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterReputationProgress,
  CharacterReputationSummary,
} from '../models/character-reputation.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterReputationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getProgress(characterId: string): Observable<CharacterReputationProgress[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterReputationProgress[]>(
      `${API_URLS.REPUTATION}/character/${characterId}`,
      httpOptions,
    );
  }

  getSummary(characterId: string): Observable<CharacterReputationSummary> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterReputationSummary>(
      `${API_URLS.REPUTATION}/character/${characterId}/summary`,
      httpOptions,
    );
  }

  updateProgress(
    characterId: string,
    reputationId: string,
    currentTier: number,
  ): Observable<CharacterReputationProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<CharacterReputationProgress>(
      `${API_URLS.REPUTATION}/character/${characterId}/reputation/${reputationId}`,
      { currentTier },
      httpOptions,
    );
  }
}
