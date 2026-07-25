import { HttpHeaders, HttpParams } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { EndeavourService } from './endeavour.service';

describe('EndeavourService', () => {
  let service: EndeavourService;
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
        EndeavourService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(EndeavourService);
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

    service.getProgress('acc1').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call getProgress without extra params', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.getProgress('acc1').subscribe();

    const req = httpMock.expectOne(`${API_URLS.ENDEAVOUR}/account/acc1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toHaveLength(0);
    req.flush([]);
  });

  it('should call getProgress with category/sort params', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service
      .getProgress('acc1', {
        category: 'Space',
        sortBy: 'name',
        sortOrder: 'ASC',
      })
      .subscribe();

    const req = httpMock.expectOne(r => {
      const params: HttpParams = r.params;
      return (
        r.url === `${API_URLS.ENDEAVOUR}/account/acc1` &&
        params.get('category') === 'Space' &&
        params.get('sortBy') === 'name' &&
        params.get('sortOrder') === 'ASC'
      );
    });
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should return error when token is missing for getSummary', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.getSummary('acc1').subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call getSummary endpoint', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.getSummary('acc1').subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.ENDEAVOUR}/account/acc1/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      totalNodes: 0,
      maxPossibleNodes: 0,
      overallCompletionPercentage: 0,
      maxedPerks: 0,
      totalPerks: 0,
      spaceNodes: 0,
      spaceMaxNodes: 0,
      spaceCompletionPercentage: 0,
      groundNodes: 0,
      groundMaxNodes: 0,
      groundCompletionPercentage: 0,
    });
  });

  it('should return error when token is missing for updateProgress', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.updateProgress('acc1', 'perk1', 3).subscribe({
      next: () => fail('expected error'),
      error: err => expect(err.message).toBe('No token found'),
    });
  });

  it('should call updateProgress endpoint with payload', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
      mockHttpOptions,
    );

    service.updateProgress('acc1', 'perk1', 3).subscribe();

    const req = httpMock.expectOne(
      `${API_URLS.ENDEAVOUR}/account/acc1/perk/perk1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentNodes: 3 });
    req.flush({});
  });
});
