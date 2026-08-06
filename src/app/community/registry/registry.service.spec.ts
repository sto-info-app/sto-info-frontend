import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  PaginatedRegistryProfiles,
  RegistryAccount,
  RegistryCharacter,
  RegistryProfile,
  RegistrySort,
} from '../models/registry.models';
import { RegistryService } from './registry.service';

describe('RegistryService', () => {
  let service: RegistryService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const emptyPage: PaginatedRegistryProfiles = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };

  beforeEach(() => {
    authService = { getHttpOptionsWithAccessToken: jest.fn(() => null) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RegistryService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(RegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * Puts the viewer in a signed-in state for the next request.
   */
  function signIn(): void {
    authService.getHttpOptionsWithAccessToken.mockReturnValue({
      headers: new HttpHeaders({ Authorization: 'Bearer token-1' }),
    });
  }

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfiles', () => {
    it('should request the profiles endpoint with no params by default', () => {
      service
        .getProfiles()
        .subscribe(result => expect(result).toEqual(emptyPage));

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.REGISTRY_PROFILES && r.params.keys().length === 0,
      );
      expect(req.request.method).toBe('GET');
      req.flush(emptyPage);
    });

    it('should send every supplied query param', () => {
      service
        .getProfiles({
          search: 'picard',
          sort: RegistrySort.RECENTLY_ACTIVE,
          page: 2,
          pageSize: 24,
        })
        .subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.REGISTRY_PROFILES &&
          r.params.get('search') === 'picard' &&
          r.params.get('sort') === 'recently-active' &&
          r.params.get('page') === '2' &&
          r.params.get('pageSize') === '24',
      );
      req.flush(emptyPage);
    });

    it('should omit falsy query params', () => {
      service.getProfiles({ search: '', page: 0, pageSize: 0 }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.REGISTRY_PROFILES && r.params.keys().length === 0,
      );
      req.flush(emptyPage);
    });

    it('should not attach an authorization header when signed out', () => {
      service.getProfiles().subscribe();

      const req = httpMock.expectOne(API_URLS.REGISTRY_PROFILES);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(emptyPage);
    });

    it('should attach the access token when signed in, so blocks are applied', () => {
      signIn();

      service.getProfiles().subscribe();

      const req = httpMock.expectOne(API_URLS.REGISTRY_PROFILES);
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush(emptyPage);
    });

    it('should keep the query params alongside the access token', () => {
      signIn();

      service.getProfiles({ search: 'picard' }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.REGISTRY_PROFILES &&
          r.params.get('search') === 'picard',
      );
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush(emptyPage);
    });
  });

  describe('getProfile', () => {
    it('should request the member by username', () => {
      service.getProfile('captain.picard').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({} as RegistryProfile);
    });

    it('should encode a username containing URL-significant characters', () => {
      service.getProfile('a b/c').subscribe();

      const req = httpMock.expectOne(`${API_URLS.REGISTRY_PROFILES}/a%20b%2Fc`);
      req.flush({} as RegistryProfile);
    });

    it('should attach the access token so the relationship comes back', () => {
      signIn();

      service.getProfile('captain.picard').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard`,
      );
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush({} as RegistryProfile);
    });
  });

  describe('getAccount', () => {
    it('should request the account nested under the member', () => {
      service.getAccount('captain.picard', 'SteveX~1234').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard/SteveX~1234`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({} as RegistryAccount);
    });

    it('should encode both segments', () => {
      service.getAccount('a b', 'c/d').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/a%20b/c%2Fd`,
      );
      req.flush({} as RegistryAccount);
    });

    it('should attach the access token so blocks are applied', () => {
      signIn();

      service.getAccount('captain.picard', 'SteveX~1234').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard/SteveX~1234`,
      );
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush({} as RegistryAccount);
    });
  });

  describe('getCharacter', () => {
    it('should request the captain nested under the member and account', () => {
      service
        .getCharacter('captain.picard', 'SteveX~1234', 'Rex@SteveX~1234')
        .subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard/SteveX~1234/Rex%40SteveX~1234`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({} as RegistryCharacter);
    });

    it('should encode all three segments', () => {
      service.getCharacter('a b', 'c/d', 'e#f').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/a%20b/c%2Fd/e%23f`,
      );
      req.flush({} as RegistryCharacter);
    });

    it('should attach the access token so blocks are applied', () => {
      signIn();

      service
        .getCharacter('captain.picard', 'SteveX~1234', 'Rex@SteveX~1234')
        .subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.REGISTRY_PROFILES}/captain.picard/SteveX~1234/Rex%40SteveX~1234`,
      );
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush({} as RegistryCharacter);
    });
  });
});
