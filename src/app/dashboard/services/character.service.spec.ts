import { HttpHeaders, provideHttpClient } from '@angular/common/http';
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
  } as unknown as ReturnType<AuthService['getHttpOptionsWithAccessToken']>;

  const createMockCharacter = (
    overrides: Partial<Character> = {},
  ): Character => {
    const { publiclyVisible, ...otherOverrides } = overrides;

    return {
      id: '1',
      accountId: 'acc1',
      handle: 'TestHandle',
      generalFactionId: 'gf1',
      factionId: 'f1',
      sexId: 's1',
      classId: 'c1',
      recruitTypeId: 'r1',
      speciesId: 'sp1',
      level: 65,
      userId: 'u1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...otherOverrides,
      publiclyVisible: publiclyVisible ?? true,
    };
  };

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
      const mockCharacters = [
        createMockCharacter({ id: '1', handle: 'Char1' }),
      ];

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
      const mockCharacters = [
        createMockCharacter({ id: '1', handle: 'Char1' }),
      ];
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
      const mockCharacter = createMockCharacter({ id: '1', handle: 'Char1' });

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
        accountId: 'aaa',
        handle: 'NewHandle',
        generalFactionId: 'gf1',
        factionId: 'f1',
        sexId: 's1',
        classId: 'c1',
        recruitTypeId: 'r1',
        speciesId: 'sp1',
        level: 1,
      };
      const createdChar = createMockCharacter({ id: '1', ...newChar });

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
      service.createCharacter({} as CreateCharacterRequest).subscribe({
        error: err => expect(err.message).toBe('No token found'),
      });
      httpMock.expectNone(API_URLS.CHARACTER);
    });
  });

  describe('updateCharacter', () => {
    it('should update character', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(mockHeader);
      const updateReq: UpdateCharacterRequest = { handle: 'UpdatedHandle' };
      const updatedChar = createMockCharacter({
        id: '1',
        handle: 'UpdatedHandle',
      });

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
      service.updateCharacter('1', {} as UpdateCharacterRequest).subscribe({
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

      const mockHeadersObj: {
        has: jest.Mock<boolean, [string]>;
        delete: jest.Mock<typeof mockHeadersObj, [string]>;
        get: jest.Mock<string | undefined, [string]>;
      } = {
        has: jest.fn(k => headersMap.has(k)),
        delete: jest.fn(k => {
          headersMap.delete(k);
          return mockHeadersObj;
        }),
        get: jest.fn(k => headersMap.get(k)),
      };

      const mockOptions = {
        headers: mockHeadersObj as unknown as HttpHeaders,
      };
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(
        mockOptions,
      );

      const formData = new FormData();
      formData.append('file', 'data');
      const updatedChar = createMockCharacter({
        id: '1',
        profilePicture: 'url',
      });

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
