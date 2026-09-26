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
});
