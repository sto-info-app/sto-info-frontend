import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CharacterSpecializationService } from './character-specialization.service';

describe('CharacterSpecializationService', () => {
  let service: CharacterSpecializationService;
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
        CharacterSpecializationService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(CharacterSpecializationService);
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

    const req = httpMock.expectOne(
      `${API_URLS.SPECIALIZATION}/character/char1`,
    );
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
      `${API_URLS.SPECIALIZATION}/character/char1/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      totalPoints: 0,
      maxPossiblePoints: 0,
      overallCompletionPercentage: 0,
      completedSpecializations: 0,
      totalSpecializations: 0,
      primarySpecializationName: null,
      secondarySpecializationName: null,
    });
  });

  it('should return error when token is missing for updateProgress', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.updateProgress('char1', 'spec1', 5).subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call updateProgress endpoint with points-only payload', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.updateProgress('char1', 'spec1', 5).subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.SPECIALIZATION}/character/char1/specialization/spec1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ pointsSpent: 5 });
    req.flush({});
  });

  it('should return error when token is missing for updateSlot', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.updateSlot('char1', 'spec1', 'primary').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call updateSlot endpoint with slot-only payload', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.updateSlot('char1', 'spec1', 'primary').subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.SPECIALIZATION}/character/char1/specialization/spec1/slot`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ slot: 'primary' });
    req.flush({});
  });

  it('should send a null slot when deactivating a specialization', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.updateSlot('char1', 'spec1', null).subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.SPECIALIZATION}/character/char1/specialization/spec1/slot`,
    );
    expect(req.request.body).toEqual({ slot: null });
    req.flush({});
  });
});
