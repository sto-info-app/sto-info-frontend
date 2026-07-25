import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CharacterClass,
  Faction,
  GeneralFaction,
  RecruitType,
  Sex,
  Species,
} from '../models/character.model';
import { CharacterLookupService } from './character-lookup.service';

describe('CharacterLookupService', () => {
  let service: CharacterLookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CharacterLookupService,
      ],
    });
    service = TestBed.inject(CharacterLookupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should getGeneralFactions', () => {
    const dummy = [{ id: '1' }];
    service.getGeneralFactions().subscribe((res: GeneralFaction[]) => {
      expect(res).toEqual(dummy);
    });
    const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_GENERAL_FACTIONS);
    expect(req.request.method).toBe('GET');
    req.flush(dummy);
  });

  it('should getGeneralFactions with factionId', () => {
    const dummy = [{ id: '1' }];
    service.getGeneralFactions('fed').subscribe((res: GeneralFaction[]) => {
      expect(res).toEqual(dummy);
    });
    const req = httpMock.expectOne(
      req =>
        req.url === API_URLS.CHARACTER_LOOKUP_GENERAL_FACTIONS &&
        req.params.get('factionId') === 'fed',
    );
    expect(req.request.method).toBe('GET');
    req.flush(dummy);
  });

  it('should getFactions', () => {
    const dummy = [{ id: '1' }];
    service.getFactions().subscribe((res: Faction[]) => {
      expect(res).toEqual(dummy);
    });
    const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_FACTIONS);
    expect(req.request.method).toBe('GET');
    req.flush(dummy);
  });

  it('should getSexes', () => {
    const dummy = [{ id: '1' }];
    service.getSexes().subscribe((res: Sex[]) => {
      expect(res).toEqual(dummy);
    });
    const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_SEXES);
    expect(req.request.method).toBe('GET');
    req.flush(dummy);
  });

  it('should getClasses', () => {
    const dummy = [{ id: '1' }];
    service.getClasses().subscribe((res: CharacterClass[]) => {
      expect(res).toEqual(dummy);
    });
    const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_CLASSES);
    expect(req.request.method).toBe('GET');
    req.flush(dummy);
  });

  describe('getRecruitTypes', () => {
    it('should get recruit types without params', () => {
      const dummy = [{ id: '1' }];
      service.getRecruitTypes().subscribe((res: RecruitType[]) => {
        expect(res).toEqual(dummy);
      });
      const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_RECRUIT_TYPES);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush(dummy);
    });

    it('should get recruit types with factionId', () => {
      const dummy = [{ id: '1' }];
      service.getRecruitTypes('fed').subscribe((res: RecruitType[]) => {
        expect(res).toEqual(dummy);
      });
      const req = httpMock.expectOne(
        req =>
          req.url === API_URLS.CHARACTER_LOOKUP_RECRUIT_TYPES &&
          req.params.get('factionId') === 'fed',
      );
      expect(req.request.method).toBe('GET');
      req.flush(dummy);
    });
  });

  describe('getSpecies', () => {
    it('should get species without params', () => {
      const dummy = [{ id: '1' }];
      service.getSpecies().subscribe((res: Species[]) => {
        expect(res).toEqual(dummy);
      });
      const req = httpMock.expectOne(API_URLS.CHARACTER_LOOKUP_SPECIES);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush(dummy);
    });

    it('should get species with params', () => {
      const dummy = [{ id: '1' }];
      service.getSpecies('fed', 'std').subscribe((res: Species[]) => {
        expect(res).toEqual(dummy);
      });
      const req = httpMock.expectOne(
        req =>
          req.url === API_URLS.CHARACTER_LOOKUP_SPECIES &&
          req.params.get('factionId') === 'fed' &&
          req.params.get('recruitTypeId') === 'std',
      );
      expect(req.request.method).toBe('GET');
      req.flush(dummy);
    });
  });
});
