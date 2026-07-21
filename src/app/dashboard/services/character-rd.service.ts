import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterRdProgress,
  CharacterRdSummary,
} from '../models/character-rd.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterRdService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getProgress(characterId: string): Observable<CharacterRdProgress[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterRdProgress[]>(
      `${API_URLS.RD}/character/${characterId}`,
      httpOptions,
    );
  }

  getSummary(characterId: string): Observable<CharacterRdSummary> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterRdSummary>(
      `${API_URLS.RD}/character/${characterId}/summary`,
      httpOptions,
    );
  }

  updateProgress(
    characterId: string,
    schoolId: string,
    currentLevel: number,
  ): Observable<CharacterRdProgress> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<CharacterRdProgress>(
      `${API_URLS.RD}/character/${characterId}/school/${schoolId}`,
      { currentLevel },
      httpOptions,
    );
  }
}
