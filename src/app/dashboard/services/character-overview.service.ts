import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CharacterOverviewSummary } from '../models/character-overview.model';

@Injectable({ providedIn: 'root' })
export class CharacterOverviewService {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(AuthService);

  /**
   * Fetches every tracker's summary for a captain in one request.
   *
   * @param characterId - The captain whose summaries are wanted.
   * @returns The five summaries, keyed by tracker.
   */
  getSummary(characterId: string): Observable<CharacterOverviewSummary> {
    const options = this._auth.getHttpOptionsWithAccessToken();
    if (!options) return throwError(() => new Error('No token found'));
    return this._http.get<CharacterOverviewSummary>(
      `${API_URLS.CHARACTER_OVERVIEW}/character/${characterId}/summary`,
      options,
    );
  }
}
