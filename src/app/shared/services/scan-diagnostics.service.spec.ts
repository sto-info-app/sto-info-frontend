import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ScanDiagnostics } from 'src/app/models/scan-diagnostics.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ScanDiagnosticsService } from './scan-diagnostics.service';

const AUTH_HEADER = 'Bearer token-1';

const DIAGNOSTICS: ScanDiagnostics = {
  generatedAt: '2026-09-26T12:00:00.000Z',
  usage: null,
  engine: null,
  queue: null,
  awaiting: { quarantined: 0, scanning: 0, retryPending: 0 },
  workers: null,
  alerts: [],
  publication: {
    paused: false,
    pausedAt: null,
    pausedByUserId: null,
    pausedByUsername: null,
    queuePaused: null,
    held: null,
  },
  owedPurges: { owed: 0, overdue: 0, oldestHours: null },
};

describe('ScanDiagnosticsService', () => {
  let service: ScanDiagnosticsService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ScanDiagnosticsService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(ScanDiagnosticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the diagnostics with the access token attached', () => {
    let received: ScanDiagnostics | undefined;
    service.read().subscribe(diagnostics => (received = diagnostics));

    const request = httpMock.expectOne(
      API_URLS.FILE_SCANNING_ADMIN_DIAGNOSTICS,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush(DIAGNOSTICS);

    expect(received).toEqual(DIAGNOSTICS);
  });

  it('fails without a request when signed out', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    let failure: Error | undefined;

    service.read().subscribe({ error: (error: Error) => (failure = error) });

    httpMock.expectNone(API_URLS.FILE_SCANNING_ADMIN_DIAGNOSTICS);
    expect(failure?.message).toBe('No token found');
  });

  // FC-039.
  it('reads a page of refused assets', () => {
    service.rejections(2).subscribe();

    const request = httpMock.expectOne(
      req => req.url === API_URLS.FILE_SCANNING_ADMIN_REJECTIONS,
    );

    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });

  it('reads one asset’s outcome, its ID kept to one path segment', () => {
    service.asset('asset/1').subscribe();

    const request = httpMock.expectOne(
      `${API_URLS.FILE_SCANNING_ADMIN_ASSETS}/asset%2F1`,
    );

    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
