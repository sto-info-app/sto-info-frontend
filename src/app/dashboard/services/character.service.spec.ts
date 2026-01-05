import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../models/character.model';
import { CharacterService } from './character.service';

describe('CharacterService', () => {
  let service: CharacterService;
  let httpMock: HttpTestingController;
  let mockAuthService: jest.Mocked<AuthService>;

  const mockHeader = {
    headers: {
      Authorization: 'Bearer token',
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    mockAuthService = {
      getHttpOptionsWithAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CharacterService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(CharacterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCharacters', () => {
    it('should return characters when token is present', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const mockCharacters = [{ id: '1', name: 'Char 1' } as Character];

      service.getCharacters().subscribe(chars => {
        expect(chars).toEqual(mockCharacters);
      });

      const req = httpMock.expectOne(API_URLS.CHARACTER);
      expect(req.request.method).toBe('GET');
      req.flush(mockCharacters);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.getCharacters().subscribe({
        error: err => {
          expect(err.message).toBe('No token found');
        },
      });

      httpMock.expectNone(API_URLS.CHARACTER);
    });
  });

  describe('getCharactersByAccount', () => {
    it('should return characters for account when token is present', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const mockCharacters = [{ id: '1', name: 'Char 1' } as Character];
      const accountId = 'acc1';

      service.getCharactersByAccount(accountId).subscribe(chars => {
        expect(chars).toEqual(mockCharacters);
      });

      const req = httpMock.expectOne(
        req =>
          req.url === API_URLS.CHARACTER &&
          req.params.get('accountId') === accountId,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCharacters);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.getCharactersByAccount('acc1').subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(API_URLS.CHARACTER);
    });
  });

  describe('getCharacter', () => {
    it('should return character by id', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const mockCharacter = { id: '1', name: 'Char 1' } as Character;

      service.getCharacter('1').subscribe(char => {
        expect(char).toEqual(mockCharacter);
      });

      const req = httpMock.expectOne(`${API_URLS.CHARACTER}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCharacter);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.getCharacter('1').subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(`${API_URLS.CHARACTER}/1`);
    });
  });

  describe('createCharacter', () => {
    it('should create character', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const newChar: CreateCharacterRequest = {
        name: 'New',
        handle: 'Handle',
        speciesId: 'aaa',
        genderId: 'aaa',
        careerId: 'aaa',
        factionId: 'aaa',
        accountId: 'aaa',
      };
      const createdChar = { id: '1', ...newChar } as Character;

      service.createCharacter(newChar).subscribe(char => {
        expect(char).toEqual(createdChar);
      });

      const req = httpMock.expectOne(API_URLS.CHARACTER);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newChar);
      req.flush(createdChar);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.createCharacter({} as any).subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(API_URLS.CHARACTER);
    });
  });

  describe('updateCharacter', () => {
    it('should update character', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const updateReq: UpdateCharacterRequest = { id: '1', name: 'Upd' };
      const updatedChar = { id: '1', name: 'Upd' } as Character;

      service.updateCharacter('1', updateReq).subscribe(char => {
        expect(char).toEqual(updatedChar);
      });

      const req = httpMock.expectOne(`${API_URLS.CHARACTER}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateReq);
      req.flush(updatedChar);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.updateCharacter('1', {} as any).subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(`${API_URLS.CHARACTER}/1`);
    });
  });

  describe('deleteCharacter', () => {
    it('should delete character', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);

      service.deleteCharacter('1').subscribe(res => {
        expect(res).toBeNull(); // delete returns void/null usually on success with 200/204
      });

      const req = httpMock.expectOne(`${API_URLS.CHARACTER}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.deleteCharacter('1').subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(`${API_URLS.CHARACTER}/1`);
    });
  });

  describe('updateCharacterProfilePic', () => {
    it('should upload profile pic and remove Content-Type header', () => {
      const headersMap = new Map<string, string>();
      headersMap.set('Content-Type', 'multipart/form-data');
      headersMap.set('Authorization', 'Bearer token');

      const mockHeadersObj = {
        has: jest.fn(k => headersMap.has(k)),
        delete: jest.fn(k => {
          headersMap.delete(k);
          return mockHeadersObj;
        }),
        get: jest.fn(k => headersMap.get(k)),
      };

      const mockOptions = { headers: mockHeadersObj };
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(
        mockOptions as any,
      );

      const formData = new FormData();
      formData.append('file', 'data');
      const updatedChar = { id: '1', profilePicture: 'url' } as Character;

      service.updateCharacterProfilePic('1', formData).subscribe(char => {
        expect(char).toEqual(updatedChar);
      });

      expect(mockHeadersObj.has).toHaveBeenCalledWith('Content-Type');
      expect(mockHeadersObj.delete).toHaveBeenCalledWith('Content-Type');

      const req = httpMock.expectOne(`${API_URLS.CHARACTER}/1/profile-image`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(formData);
      req.flush(updatedChar);
    });

    it('should throw error when no token', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.updateCharacterProfilePic('1', new FormData()).subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(`${API_URLS.CHARACTER}/1/profile-image`);
    });
  });
});
