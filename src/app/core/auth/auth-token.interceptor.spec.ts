import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from './auth.service';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: {
    isTokenValid: jest.Mock;
    ensureFreshAccessToken: jest.Mock;
  };

  const apiUrl = `${API_URLS.ROOT}/user/settings`;

  beforeEach(() => {
    authService = {
      isTokenValid: jest.fn().mockReturnValue(true),
      ensureFreshAccessToken: jest.fn().mockReturnValue(of('renewed')),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should leave a successful request alone', () => {
    let body: unknown;
    http.get(apiUrl).subscribe(response => (body = response));

    httpMock.expectOne(apiUrl).flush({ privacyMode: false });

    expect(body).toEqual({ privacyMode: false });
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });

  it('should renew the access token and retry once after a 401', () => {
    let body: unknown;
    http.get(apiUrl).subscribe(response => (body = response));

    httpMock
      .expectOne(apiUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const retry = httpMock.expectOne(apiUrl);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer renewed');
    retry.flush({ privacyMode: true });

    expect(body).toEqual({ privacyMode: true });
    expect(authService.ensureFreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('should not retry when the session itself has ended', () => {
    authService.isTokenValid.mockReturnValue(false);
    let status: number | undefined;
    http.get(apiUrl).subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(apiUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });

  it('should not retry the refresh endpoint itself', () => {
    let status: number | undefined;
    http
      .post(API_URLS.AUTH_REFRESH, {})
      .subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(API_URLS.AUTH_REFRESH)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });

  it('should not retry a rejected login', () => {
    let status: number | undefined;
    http
      .post(API_URLS.AUTH_LOGIN, {})
      .subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(API_URLS.AUTH_LOGIN)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });

  it('should leave requests to other hosts alone', () => {
    const externalUrl = 'https://example.test/thing';
    let status: number | undefined;
    http
      .get(externalUrl)
      .subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(externalUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });

  it('should report the original failure when the renewal fails', () => {
    authService.ensureFreshAccessToken.mockReturnValue(
      throwError(() => new Error('refresh failed')),
    );
    let status: number | undefined;
    http.get(apiUrl).subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(apiUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });

  it('should pass a non-401 failure straight through', () => {
    let status: number | undefined;
    http.get(apiUrl).subscribe({ error: error => (status = error.status) });

    httpMock
      .expectOne(apiUrl)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
    expect(authService.ensureFreshAccessToken).not.toHaveBeenCalled();
  });
});
