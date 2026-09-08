import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterAdmiraltyProgress,
  CharacterAdmiraltySummary,
} from '../models/character-admiralty.model';

@Injectable({ providedIn: 'root' })
export class CharacterAdmiraltyService {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(AuthService);

  getProgress(characterId: string): Observable<CharacterAdmiraltyProgress[]> {
    const options = this._auth.getHttpOptionsWithAccessToken();
    if (!options) return throwError(() => new Error('No token found'));
    return this._http.get<CharacterAdmiraltyProgress[]>(
      `${API_URLS.ADMIRALTY}/character/${characterId}`,
      options,
    );
  }

  getSummary(characterId: string): Observable<CharacterAdmiraltySummary> {
    const options = this._auth.getHttpOptionsWithAccessToken();
    if (!options) return throwError(() => new Error('No token found'));
    return this._http.get<CharacterAdmiraltySummary>(
      `${API_URLS.ADMIRALTY}/character/${characterId}/summary`,
      options,
    );
  }

  updateProgress(
    characterId: string,
    campaignId: string,
    currentTier: number,
    tourOfDutyStep: number,
  ): Observable<CharacterAdmiraltyProgress> {
    const options = this._auth.getHttpOptionsWithAccessToken();
    if (!options) return throwError(() => new Error('No token found'));
    return this._http.put<CharacterAdmiraltyProgress>(
      `${API_URLS.ADMIRALTY}/character/${characterId}/campaign/${campaignId}`,
      { currentTier, tourOfDutyStep },
      options,
    );
  }
}
