import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CharacterReputationService } from './character-reputation.service';

describe('CharacterReputationService', () => {
  let service: CharacterReputationService;
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
        CharacterReputationService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(CharacterReputationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return error when token is missing for getProgress', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.getProgress('char1').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call getProgress endpoint', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.getProgress('char1').subscribe();

    const req = httpMock.expectOne(`${API_URLS.REPUTATION}/character/char1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should return error when token is missing for getSummary', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.getSummary('char1').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call getSummary endpoint', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.getSummary('char1').subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.REPUTATION}/character/char1/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      totalTiers: 0,
      maxPossibleTiers: 0,
      overallCompletionPercentage: 0,
      completedReputations: 0,
      totalReputations: 0,
    });
  });

  it('should return error when token is missing for updateProgress', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.updateProgress('char1', 'rep1', 3).subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call updateProgress endpoint with tier-only payload', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.updateProgress('char1', 'rep1', 3).subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.REPUTATION}/character/char1/reputation/rep1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentTier: 3 });
    req.flush({});
  });
});
