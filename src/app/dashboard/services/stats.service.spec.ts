import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StatsData } from '../stats/stats.component';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<AuthService>;

  const mockHttpOptions = { headers: new HttpHeaders() };

  const mockStats: StatsData = {
    accountCount: 2,
    lifetimeSubCount: 1,
    characterCount: 5,
    avgLevel: 60,
    minLevel: 10,
    maxLevel: 65,
    bySpecies: [{ name: 'Human', count: 3 }],
    byGeneralFaction: [{ name: 'Federation', count: 5 }],
    byFaction: [{ name: 'Starfleet', count: 5 }],
    byClass: [{ name: 'Tactical', count: 3 }],
    bySex: [{ name: 'Male', count: 3 }],
    byRecruitType: [{ name: 'Normal', count: 5 }],
    byLevelRange: [{ name: 'Admiral (60–65)', count: 3 }],
    byPlatform: [{ name: 'Steam', count: 2 }],
    byLauncher: [{ name: 'Steam', count: 2 }],
  };

  beforeEach(() => {
    authServiceSpy = {
      getHttpOptionsWithAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StatsService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(StatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStats', () => {
    it('should fetch stats without accountId when token is present', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );

      service.getStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
      });

      const req = httpMock.expectOne(API_URLS.STATS);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('should fetch stats with accountId query param when provided', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );

      service.getStats('acc123').subscribe(stats => {
        expect(stats).toEqual(mockStats);
      });

      const req = httpMock.expectOne(`${API_URLS.STATS}?accountId=acc123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('should return throwError when no token is present', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.getStats().subscribe({
        next: () => fail('should have errored'),
        error: err => {
          expect(err.message).toBe('No token found');
        },
      });
    });

    it('should not append accountId param when accountId is null', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );

      service.getStats(null).subscribe(stats => {
        expect(stats).toEqual(mockStats);
      });

      const req = httpMock.expectOne(API_URLS.STATS);
      req.flush(mockStats);
    });
  });
});
