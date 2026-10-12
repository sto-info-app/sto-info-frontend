import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CharacterOverviewService } from './character-overview.service';

describe('CharacterOverviewService', () => {
  let service: CharacterOverviewService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<AuthService>;

  const mockHttpOptions = { headers: new HttpHeaders() };

  beforeEach(() => {
    authServiceSpy = {
      getHttpOptionsWithAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CharacterOverviewService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(CharacterOverviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return error when token is missing for getSummary', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.getSummary('char1').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call the overview summary endpoint for the captain', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.getSummary('char1').subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.CHARACTER_OVERVIEW}/character/char1/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
