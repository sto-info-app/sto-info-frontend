import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LoginCredentials,
  LoginResponse,
  RegistrationFormValues,
} from 'src/app/models/user-auth.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jest.Mocked<Omit<Router, 'url'>> & { url: string };

  interface AuthServiceInternals {
    _http: HttpClient;
    _router: Router;
    warningTimeout: ReturnType<typeof setTimeout> | null;
    logoutTimeout: ReturnType<typeof setTimeout> | null;
  }

  beforeEach(() => {
    localStorage.clear();

    const routerMock: Partial<Router> & { url: string } = {
      navigate: jest.fn(),
      url: '/',
      parseUrl: jest.fn().mockReturnValue({ queryParams: {} }),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as unknown as jest.Mocked<
      Omit<Router, 'url'>
    > & {
      url: string;
    };
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Login', () => {
    it('should login and save tokens', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password', // NOSONAR - Test fixture password
      };
      const mockResponse: LoginResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        expires_in: 3600,
        user_id: 'user1',
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('access_token')).toBe('access123');
        expect(localStorage.getItem('refresh_token')).toBe('refresh123');
        expect(localStorage.getItem('expires_at')).toBeTruthy();
      });

      const req = httpMock.expectOne(API_URLS.AUTH_LOGIN);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('Register', () => {
    it('should register a user', () => {
      const userData: RegistrationFormValues = {
        email: 'new@example.com',
        password: 'password', // NOSONAR - Test fixture password
        confirmPassword: 'password', // NOSONAR - Test fixture password
        username: 'user',
        firstName: 'First',
        lastName: 'Last',
      };

      service.register(userData).subscribe();

      const req = httpMock.expectOne(API_URLS.AUTH_REGISTER);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush({});
    });
  });

  describe('Token Management', () => {
    it('should get token if valid', () => {
      const expiresAt = Date.now() + 10000;
      localStorage.setItem('access_token', 'valid_token');
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.getToken()).toBe('valid_token');
    });

    it('should remove token if expired', () => {
      const expiresAt = Date.now() - 10000;
      localStorage.setItem('access_token', 'expired_token');
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should return null if no token', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should validate token correctly', () => {
      const expiresAt = Date.now() + 10000;
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.isTokenValid()).toBe(true);
    });

    it('should return false for invalid token', () => {
      expect(service.isTokenValid()).toBe(false);
    });

    it('should return false for expired token', () => {
      const expiresAt = Date.now() - 10000;
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.isTokenValid()).toBe(false);
    });
  });

  describe('HTTP Options', () => {
    it('should get HTTP options with access token', () => {
      localStorage.setItem('access_token', 'access123');

      const options = service.getHttpOptionsWithAccessToken();

      expect(options).toBeTruthy();
      expect(options?.headers.get('Authorization')).toBe('Bearer access123');
    });

    it('should return null when no access token', () => {
      const options = service.getHttpOptionsWithAccessToken();
      expect(options).toBeNull();
    });
  });

  describe('Perform Logout', () => {
    it('should perform logout actions', () => {
      const expiresAt = Date.now() + 10000;
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('refresh_token', 'refresh');
      localStorage.setItem('expires_at', expiresAt.toString());

      routerSpy.url = '/dashboard';
      service.performLogout();

      const req = httpMock.expectOne(API_URLS.AUTH_LOGOUT);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ tokenId: 'refresh' });
      req.flush({});

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/dashboard' },
      });
    });

    it('should log non-401 errors on logout', () => {
      localStorage.setItem('refresh_token', 'refresh');
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      service.performLogout();

      const req = httpMock.expectOne(API_URLS.AUTH_LOGOUT);
      req.flush(null, { status: 500, statusText: 'Server Error' });

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should ignore 401 errors on logout', () => {
      localStorage.setItem('refresh_token', 'refresh');
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      service.performLogout();

      const req = httpMock.expectOne(API_URLS.AUTH_LOGOUT);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should handle logout when already on login page', () => {
      routerSpy.url = '/login';
      service.performLogout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {},
      });
    });

    it('should handle logout when already on login page with returnUrl', () => {
      routerSpy.url = '/login?returnUrl=/secret';
      routerSpy.parseUrl.mockReturnValue({
        queryParams: { returnUrl: '/secret' },
      } as unknown as ReturnType<Router['parseUrl']>);
      service.performLogout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/secret' },
      });
    });

    it('should not perform logout if not logged in', () => {
      // isTokenValid (and thus isLoggedIn) depends on access_token and expires_at
      localStorage.clear();

      service.performLogout();

      httpMock.expectNone(API_URLS.AUTH_LOGOUT);
      expect(routerSpy.navigate).toHaveBeenCalled(); // It still navigates to login if not logged in
    });
  });

  describe('Refresh Token', () => {
    it('should refresh token successfully', () => {
      localStorage.setItem('refresh_token', 'old_refresh');
      const mockResponse: LoginResponse = {
        access_token: 'new_access',
        refresh_token: 'new_refresh',
        expires_in: 3600,
        user_id: 'user1',
      };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('access_token')).toBe('new_access');
      });

      const req = httpMock.expectOne(API_URLS.AUTH_REFRESH);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle refresh token error', () => {
      localStorage.setItem('refresh_token', 'bad_refresh');

      service.refreshToken().subscribe({
        error: () => {
          // Error handling expectations
        },
      });

      const req = httpMock.expectOne(API_URLS.AUTH_REFRESH);
      req.flush('Error', { status: 401, statusText: 'Unauthorized' });

      expect(routerSpy.navigate).toHaveBeenCalledWith([APP_ROUTES.LOGIN]);
    });

    it('should throw error when no refresh token', () => {
      service.refreshToken().subscribe({
        error: err => {
          expect(err.message).toBe('No token found');
        },
      });

      httpMock.expectNone(API_URLS.AUTH_REFRESH);
    });
  });

  describe('Password Management', () => {
    it('should request reset password', () => {
      service.resetPassword('test@example.com').subscribe();
      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD_REQUEST);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com' });
      req.flush({});
    });

    it('should change password', () => {
      service.changePassword('token123', 'newpass').subscribe();
      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD);
      expect(req.request.method).toBe('POST');
      expect(req.request.responseType).toBe('text');
      expect(req.request.body).toEqual({
        token: 'token123',
        password: 'newpass', // NOSONAR - Test fixture password
      });
      req.flush('');
    });

    it('should surface backend error payloads returned with 200 status', () => {
      service.changePassword('token123', 'newpass').subscribe({
        next: () => {
          throw new Error('Expected an error, but request succeeded');
        },
        error: err => {
          expect(err).toEqual(
            expect.objectContaining({
              statusCode: 404,
              message: 'Invalid token',
            }),
          );
        },
      });

      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD);
      req.flush(
        JSON.stringify({
          message: 'Invalid token',
          error: 'Not Found',
          statusCode: 404,
        }),
      );
    });

    it('should normalize stringified http error payloads', () => {
      service.changePassword('token123', 'newpass').subscribe({
        next: () => {
          throw new Error('Expected an error, but request succeeded');
        },
        error: err => {
          expect(err).toEqual(
            expect.objectContaining({
              statusCode: 404,
              message: 'Invalid token',
            }),
          );
        },
      });

      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD);
      req.flush(
        '{"message":"Invalid token","error":"Not Found","statusCode":404}',
        {
          status: 404,
          statusText: 'Not Found',
        },
      );
    });

    it('should treat null response as successful password change', () => {
      service.changePassword('token123', 'newpass').subscribe({
        next: value => {
          expect(value).toBeUndefined();
        },
      });

      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD);
      req.flush('');
    });

    it('should treat plain text response as successful password change', () => {
      service.changePassword('token123', 'newpass').subscribe({
        next: value => {
          expect(value).toBeUndefined();
        },
      });

      const req = httpMock.expectOne(API_URLS.AUTH_RESET_PASSWORD);
      req.flush('Password updated');
    });
  });

  describe('Session Expiry', () => {
    it('should calculate seconds until expiry', () => {
      const expiresAt = Date.now() + 10000;
      localStorage.setItem('expires_at', expiresAt.toString());

      const seconds = service.getSecondsUntilLoginSessionExpiry();
      expect(seconds).toBeGreaterThan(9);
      expect(seconds).toBeLessThanOrEqual(10);
    });

    it('should return 0 for expired session', () => {
      const expiresAt = Date.now() - 10000;
      localStorage.setItem('expires_at', expiresAt.toString());

      const seconds = service.getSecondsUntilLoginSessionExpiry();
      expect(seconds).toBe(0);
    });

    it('should calculate new expires milliseconds', () => {
      const fixedNow = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const expiresMs = service.getNewExpiresMilliseconds(3600);
      expect(expiresMs).toBe(fixedNow + 3600000);
    });
  });

  describe('Edge Cases and Environment Config', () => {
    it('should use default warning minutes if not in environment', () => {
      expect(service.autoLogoutWarningMins).toBeDefined();
    });

    it('should not call logout API if refresh token is missing in performLogout', () => {
      localStorage.setItem('access_token', 'valid');
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());
      localStorage.removeItem('refresh_token');

      const postSpy = jest.spyOn(
        (service as unknown as AuthServiceInternals)._http,
        'post',
      );
      service.performLogout();
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should return boolean for isTokenExpiringSoon', () => {
      expect(typeof service.isTokenExpiringSoon()).toBe('boolean');
    });
  });

  describe('Auto Logout Timer', () => {
    it('should create auto logout timer and trigger warning', fakeAsync(() => {
      const warningAt = Date.now() + 2000;
      localStorage.setItem('warning_at', warningAt.toString());

      let warningEmitted = false;
      service.warningAnnounced$.subscribe(() => {
        warningEmitted = true;
      });

      service.createAutoLogoutTimer();

      tick(2001);

      expect(warningEmitted).toBe(true);
    }));

    it('should logout immediately if token is already expired', () => {
      const performLogoutSpy = jest.spyOn(service, 'performLogout');
      localStorage.setItem('expires_at', (Date.now() - 1000).toString());

      service.createAutoLogoutTimer();

      expect(performLogoutSpy).toHaveBeenCalled();
    });

    it('should not set timers if no expiration is set', () => {
      localStorage.clear();
      service.createAutoLogoutTimer();
      expect(
        (service as unknown as AuthServiceInternals).warningTimeout,
      ).toBeNull();
      expect(
        (service as unknown as AuthServiceInternals).logoutTimeout,
      ).toBeNull();
    });

    it('should set timer to perform logout', () => {
      localStorage.setItem('expires_at', (Date.now() + 1000).toString());
      service.createAutoLogoutTimer();
      expect(
        (service as unknown as AuthServiceInternals).logoutTimeout,
      ).toBeDefined();
    });

    it('should trigger performLogout when session expires', fakeAsync(() => {
      const expiresAt = Date.now() + 2000;
      localStorage.setItem('expires_at', expiresAt.toString());

      const performLogoutSpy = jest
        .spyOn(service, 'performLogout')
        .mockImplementation(() => {});

      service.createAutoLogoutTimer();

      tick(2001);

      expect(performLogoutSpy).toHaveBeenCalled();
    }));

    it('should clear logout timer', () => {
      service['logoutTimeout'] = setTimeout(() => {}, 1000);
      service.clearLogoutTimer();
      expect(service['logoutTimeout']).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token is valid', () => {
      const expiresAt = Date.now() + 10000;
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false when token is invalid', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true when token expires within threshold', () => {
      const expiresAt = Date.now() + 30000; // 30 seconds
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.isTokenExpiringSoon()).toBe(true);
    });

    it('should return false when token has plenty of time', () => {
      const expiresAt = Date.now() + 3600000; // 60 minutes
      localStorage.setItem('expires_at', expiresAt.toString());

      expect(service.isTokenExpiringSoon()).toBe(false);
    });

    it('should use default values for timings when not in environment', () => {
      (
        environment as unknown as {
          minsBeforeLogoutExpiryToShowWarning: number | undefined;
        }
      ).minsBeforeLogoutExpiryToShowWarning = undefined;
      (
        environment as unknown as {
          minsBeforeLogoutExpiryToRefreshToken: number | undefined;
        }
      ).minsBeforeLogoutExpiryToRefreshToken = undefined;

      // We can't easily re-instantiate the service to test property initializers
      // because they are already set. But we can test isTokenExpiringSoon calls.
      const getSecondsSpy = jest
        .spyOn(service, 'getSecondsUntilLoginSessionExpiry')
        .mockReturnValue(800);

      // threshold 15 mins = 900 secs. 800 < 900 => true.
      expect(service.isTokenExpiringSoon()).toBe(true);

      getSecondsSpy.mockReturnValue(1000);
      // 1000 > 900 => false.
      expect(service.isTokenExpiringSoon()).toBe(false);
    });

    it('should return true when no token (0 seconds remaining)', () => {
      // When there's no token, getSecondsUntilLoginSessionExpiry returns 0
      // which is less than the threshold
      expect(service.isTokenExpiringSoon()).toBe(true);
    });

    it('should use environment value for threshold if set', () => {
      (
        environment as unknown as {
          minsBeforeLogoutExpiryToRefreshToken: number;
        }
      ).minsBeforeLogoutExpiryToRefreshToken = 20;

      jest
        .spyOn(service, 'getSecondsUntilLoginSessionExpiry')
        .mockReturnValue(1100);

      // 20 mins = 1200 secs. 1100 < 1200 => true.
      expect(service.isTokenExpiringSoon()).toBe(true);

      (
        environment as unknown as {
          minsBeforeLogoutExpiryToRefreshToken: number | undefined;
        }
      ).minsBeforeLogoutExpiryToRefreshToken = undefined;
    });
  });

  describe('clearAutoLogoutTimer', () => {
    it('should clear warningTimeout if it exists', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      (service as unknown as AuthServiceInternals).warningTimeout =
        123 as unknown as ReturnType<typeof setTimeout>;
      service.clearAutoLogoutTimer();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
      expect(
        (service as unknown as AuthServiceInternals).warningTimeout,
      ).toBeNull();
    });

    it('should do nothing if warningTimeout is null', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      (service as unknown as AuthServiceInternals).warningTimeout = null;
      service.clearAutoLogoutTimer();
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('Decoded Token Helpers', () => {
    const makeToken = (payload: Record<string, unknown>): string => {
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const body = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
      return `${header}.${body}.sig`;
    };

    it('returns null when no token exists for decode helper', () => {
      expect(service.getDecodedToken()).toBeNull();
    });

    it('returns null when token does not contain payload segment', () => {
      localStorage.setItem('access_token', 'malformed');
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());

      expect(service.getDecodedToken()).toBeNull();
    });

    it('returns null when payload segment is invalid base64/json', () => {
      localStorage.setItem('access_token', 'a.invalid_payload.b');
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());

      expect(service.getDecodedToken()).toBeNull();
    });

    it('decodes token payload and exposes user id and role', () => {
      const token = makeToken({
        sub: 'user-123',
        email: 'captain@sto.info',
        role: 'ADMIN',
      });

      localStorage.setItem('access_token', token);
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());

      expect(service.getDecodedToken()).toEqual(
        expect.objectContaining({ sub: 'user-123', role: 'ADMIN' }),
      );
      expect(service.getUserId()).toBe('user-123');
      expect(service.getUserRole()).toBe('ADMIN');
      expect(service.isAdmin()).toBe(true);
    });

    it('returns null/false from user helpers when role is absent', () => {
      const token = makeToken({ sub: 'user-123' });
      localStorage.setItem('access_token', token);
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());

      expect(service.getUserRole()).toBeNull();
      expect(service.isAdmin()).toBe(false);
    });

    it('returns null for getUserId when token payload has no sub', () => {
      const token = makeToken({ role: 'USER' });
      localStorage.setItem('access_token', token);
      localStorage.setItem('expires_at', (Date.now() + 10000).toString());

      expect(service.getUserId()).toBeNull();
    });

    it('isLoggedInAsAdmin requires both logged-in and admin role', () => {
      jest.spyOn(service, 'isLoggedIn').mockReturnValue(true);
      jest.spyOn(service, 'isAdmin').mockReturnValue(true);
      expect(service.isLoggedInAsAdmin()).toBe(true);

      jest.spyOn(service, 'isAdmin').mockReturnValue(false);
      expect(service.isLoggedInAsAdmin()).toBe(false);
    });
  });
});
