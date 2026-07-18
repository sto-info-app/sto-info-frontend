import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  getGeneralFactions(factionId?: string): Observable<GeneralFaction[]> {
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    return this._http.get<GeneralFaction[]>(
      API_URLS.CHARACTER_LOOKUP_GENERAL_FACTIONS,
      { params },
    );
  }

  getFactions(): Observable<Faction[]> {
    return this._http.get<Faction[]>(API_URLS.CHARACTER_LOOKUP_FACTIONS);
  }

  getSexes(): Observable<Sex[]> {
    return this._http.get<Sex[]>(API_URLS.CHARACTER_LOOKUP_SEXES);
  }

  getClasses(): Observable<CharacterClass[]> {
    return this._http.get<CharacterClass[]>(API_URLS.CHARACTER_LOOKUP_CLASSES);
  }

  getRecruitTypes(factionId?: string): Observable<RecruitType[]> {
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    return this._http.get<RecruitType[]>(
      API_URLS.CHARACTER_LOOKUP_RECRUIT_TYPES,
      { params },
    );
  }

  getSpecies(
    factionId?: string,
    recruitTypeId?: string,
  ): Observable<Species[]> {
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    if (recruitTypeId) {
      params = params.set('recruitTypeId', recruitTypeId);
    }
    return this._http.get<Species[]>(API_URLS.CHARACTER_LOOKUP_SPECIES, {
      params,
    });
  }
}
