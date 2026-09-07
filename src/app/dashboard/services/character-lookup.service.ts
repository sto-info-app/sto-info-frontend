import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterClass,
  Faction,
  GeneralFaction,
  RecruitType,
  Sex,
  Species,
} from '../models/character.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterLookupService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getGeneralFactions(factionId?: string): Observable<GeneralFaction[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    return this._http.get<GeneralFaction[]>(
      API_URLS.CHARACTER_LOOKUP_GENERAL_FACTIONS,
      { ...httpOptions, params },
    );
  }

  getFactions(): Observable<Faction[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<Faction[]>(
      API_URLS.CHARACTER_LOOKUP_FACTIONS,
      httpOptions,
    );
  }

  getSexes(): Observable<Sex[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<Sex[]>(API_URLS.CHARACTER_LOOKUP_SEXES, httpOptions);
  }

  getClasses(): Observable<CharacterClass[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<CharacterClass[]>(
      API_URLS.CHARACTER_LOOKUP_CLASSES,
      httpOptions,
    );
  }

  getRecruitTypes(factionId?: string): Observable<RecruitType[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    return this._http.get<RecruitType[]>(
      API_URLS.CHARACTER_LOOKUP_RECRUIT_TYPES,
      { ...httpOptions, params },
    );
  }

  getSpecies(
    factionId?: string,
    recruitTypeId?: string,
  ): Observable<Species[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    if (recruitTypeId) {
      params = params.set('recruitTypeId', recruitTypeId);
    }
    return this._http.get<Species[]>(API_URLS.CHARACTER_LOOKUP_SPECIES, {
      ...httpOptions,
      params,
    });
  }
}
