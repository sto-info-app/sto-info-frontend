import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterSpecializationProgress,
  CharacterSpecializationSummary,
  SpecializationSlot,
} from '../models/character-specialization.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterSpecializationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getProgress(
    characterId: string,
  ): Observable<CharacterSpecializationProgress[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterSpecializationProgress[]>(
      `${API_URLS.SPECIALIZATION}/character/${characterId}`,
      httpOptions,
    );
  }

  getSummary(characterId: string): Observable<CharacterSpecializationSummary> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterSpecializationSummary>(
      `${API_URLS.SPECIALIZATION}/character/${characterId}/summary`,
      httpOptions,
    );
  }

  updateProgress(
    characterId: string,
    specializationId: string,
    pointsSpent: number,
  ): Observable<CharacterSpecializationProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<CharacterSpecializationProgress>(
      `${API_URLS.SPECIALIZATION}/character/${characterId}/specialization/${specializationId}`,
      { pointsSpent },
      httpOptions,
    );
  }

  updateSlot(
    characterId: string,
    specializationId: string,
    slot: SpecializationSlot | null,
  ): Observable<CharacterSpecializationProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<CharacterSpecializationProgress>(
      `${API_URLS.SPECIALIZATION}/character/${characterId}/specialization/${specializationId}/slot`,
      { slot },
      httpOptions,
    );
  }
}
