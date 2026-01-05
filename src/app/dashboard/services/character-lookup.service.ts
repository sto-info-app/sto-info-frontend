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
  private readonly http = inject(HttpClient);

  getGeneralFactions(): Observable<GeneralFaction[]> {
    return this.http.get<GeneralFaction[]>(
      API_URLS.CHARACTER_LOOKUP_GENERAL_FACTIONS,
    );
  }

  getFactions(): Observable<Faction[]> {
    return this.http.get<Faction[]>(API_URLS.CHARACTER_LOOKUP_FACTIONS);
  }

  getSexes(): Observable<Sex[]> {
    return this.http.get<Sex[]>(API_URLS.CHARACTER_LOOKUP_SEXES);
  }

  getClasses(): Observable<CharacterClass[]> {
    return this.http.get<CharacterClass[]>(API_URLS.CHARACTER_LOOKUP_CLASSES);
  }

  getRecruitTypes(factionId?: string): Observable<RecruitType[]> {
    let params = new HttpParams();
    if (factionId) {
      params = params.set('factionId', factionId);
    }
    return this.http.get<RecruitType[]>(
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
    return this.http.get<Species[]>(API_URLS.CHARACTER_LOOKUP_SPECIES, {
      params,
    });
  }
}
