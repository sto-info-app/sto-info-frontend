import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  catchError,
  map,
  tap,
  throwError,
} from 'rxjs';
import {
  ChangePasswordValues,
  LoginCredentials,
  LoginResponse,
  RegistrationFormValues,
} from 'src/app/models/user-auth.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _isAuthenticatedSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> =
    this._isAuthenticatedSubject.asObservable();
  public isLoggedIn$: Observable<boolean> = this.isAuthenticated$;

  private readonly _expiryAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public expiryAnnounced$: Observable<number> =
    this._expiryAnnouncedSubject.asObservable();

  private readonly _warningAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public warningAnnounced$: Observable<number> =
    this._warningAnnouncedSubject.asObservable();

  public autoLogoutWarningMins =
    environment.minsBeforeLogoutExpiryToShowWarning || 5; // 5 minutes before expiration if not set in environment settings
  public autoLogoutWarningSecs = this.autoLogoutWarningMins * 60;
  public autoLogoutWarningMilliSecs = this.autoLogoutWarningSecs * 1000;
  private warningTimeout: ReturnType<typeof setTimeout> | null = null;
  private logoutTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly _http = inject(HttpClient);
  private readonly _router = inject(Router);
  private readonly _zone = inject(NgZone);

  /**
   * Restores the authenticated state from stored tokens and schedules logout timers.
   */
  constructor() {
    // Check if there's a login token and update the BehaviorSubject
    this._isAuthenticatedSubject.next(this.isTokenValid());

    // Load any valid token expiry from localStorage and create a timer
    this.createAutoLogoutTimer();
  }

  /**
   * Sends the registration payload to the backend.
   *
   * @param user The registration form values.
   * @returns The registration request observable.
   */
  register(user: RegistrationFormValues) {
    return this._http.post(API_URLS.AUTH_REGISTER, user);
  }

  /**
   * Authenticates the user and stores the returned tokens.
   *
   * @param credentials The login credentials.
   * @returns The login response observable.
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this._http
      .post<LoginResponse>(API_URLS.AUTH_LOGIN, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap(response => {
          this.saveToken(
            response.access_token,
            response.refresh_token,
            response.expires_in,
          );
        }),
      );
  }

  /**
   * Builds authorization headers when an access token is available.
   *
   * @returns The headers object, or `null` when no access token is stored.
   */
  getHttpOptionsWithAccessToken(): { headers: HttpHeaders } | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return { headers };
  }

  /**
   * Persists access and refresh tokens and updates expiry notifications.
   *
   * @param accessToken The access token.
   * @param refreshToken The refresh token.
   * @param expiresIn The token lifetime in seconds.
   */
  saveToken(accessToken: string, refreshToken: string, expiresIn: number) {
    const expiresAt = this.getNewExpiresMilliseconds(expiresIn);
    const warningAt = expiresAt - this.autoLogoutWarningMilliSecs;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('expires_at', expiresAt.toString());
    localStorage.setItem('warning_at', warningAt.toString());

    this._isAuthenticatedSubject.next(true);
    this._expiryAnnouncedSubject.next(expiresAt);
    // Don't announce warning here - let the timer announce it when it fires

    this.createAutoLogoutTimer();
  }

  /**
   * Reads the stored access token if it is still valid.
   *
   * @returns The access token, or `null` when it is missing or expired.
   */
  getToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    if (!this.isTokenValid()) {
      // Token is expired or does not exist
      this.removeToken();
      return null;
    }
    // Token exists and is not expired
    return token;
  }

  /**
   * Clears stored tokens and notifies subscribers that the session ended.
   */
  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('warning_at');
    this._isAuthenticatedSubject.next(false);

    // Notify subscribers that the token has expired
    this._expiryAnnouncedSubject.next(0);
  }

  /**
   * Exchanges the stored refresh token for a new login session.
   *
   * @returns The refresh-token exchange observable.
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError(() => new Error('No token found'));
    }
    const body = { refresh_token: refreshToken };
    return this._http.post<LoginResponse>(API_URLS.AUTH_REFRESH, body).pipe(
      tap(response => {
        this.saveToken(
          response.access_token,
          response.refresh_token,
          response.expires_in,
        );

        const expiresAt = this.getNewExpiresMilliseconds(response.expires_in);
        this._expiryAnnouncedSubject.next(expiresAt); // Notify subscribers of the new expiry time
      }),
      catchError(error => {
        this._router.navigate([APP_ROUTES.LOGIN]);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Checks whether the stored access token is still valid.
   *
   * @returns `true` when both the token and expiry are present and unexpired.
   */
  isTokenValid(): boolean {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('expires_at');

    if (!token || !expiresAt) {
      return false;
    }

    return Date.now() < Number(expiresAt);
  }

  /**
   * Logs the user out, revokes the refresh token, and returns to the login page.
   */
  performLogout() {
    // Send a request to the backend to revoke the refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this._http
        .post(API_URLS.AUTH_LOGOUT, { tokenId: refreshToken })
        .subscribe({
          error: err => {
            // Ignore 401 errors - token may already be expired
            if (err.status !== 401) {
              console.error('Logout error:', err);
            }
          },
        });
    }

    this.clearLogoutTimer();
    this.clearAutoLogoutTimer();
    this.removeToken();

    // Signal expiry to trigger cleanup in app component
    this._expiryAnnouncedSubject.next(0);

    // Get the current URL
    let currentUrl = this._router.url;

    // If we're already on the login page, don't capture it as the returnUrl
    if (currentUrl.includes('/login')) {
      // Try to extract an existing returnUrl if possible
      const urlTree = this._router.parseUrl(currentUrl);
      const existingReturnUrl = urlTree.queryParams['returnUrl'];
      if (existingReturnUrl) {
        currentUrl = existingReturnUrl;
      } else {
        // If no existing returnUrl, just default to empty or home
        currentUrl = '';
      }
    }

    // Navigate to login page with return URL using Angular Router (no page reload)
    this._router.navigate(['/login'], {
      queryParams: currentUrl ? { returnUrl: currentUrl } : {},
    });
  }

  /**
   * Decodes the payload of the stored, still-valid access token.
   *
   * @returns The decoded payload, or `null` when there is no valid token.
   */
  getDecodedToken(): {
    sub?: string;
    email?: string;
    role?: string;
  } | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    const segments = token.split('.');
    if (segments.length < 2) {
      return null;
    }
    try {
      const normalised = segments[1].replaceAll('-', '+').replaceAll('_', '/');
      const json = atob(normalised);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Returns the current user's ID from the access token, if available.
   *
   * @returns The user ID, or `null`.
   */
  getUserId(): string | null {
    return this.getDecodedToken()?.sub ?? null;
  }

  /**
   * Returns the current user's role from the access token, if available.
   *
   * @returns The role string, or `null`.
   */
  getUserRole(): string | null {
    return this.getDecodedToken()?.role ?? null;
  }

  /**
   * Checks whether the current user is an administrator.
   *
   * Note: this only governs UI affordances; the API independently enforces
   * authorization on every admin endpoint.
   *
   * @returns `true` when the access token carries the ADMIN role.
   */
  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  /**
   * Checks whether the current user is authenticated and has admin role.
   *
   * @returns `true` when a valid session exists for an admin user.
   */
  isLoggedInAsAdmin(): boolean {
    return this.isLoggedIn() && this.isAdmin();
  }

  /**
   * Checks whether the user is currently logged in.
   *
   * @returns `true` when the stored access token is valid.
   */
  isLoggedIn(): boolean {
    return this.isTokenValid();
  }

  /**
   * Requests a password reset email for the supplied address.
   *
   * @param email The email address to reset.
   * @returns The reset request observable.
   */
  resetPassword(email: string): Observable<void> {
    return this._http
      .post(API_URLS.AUTH_RESET_PASSWORD_REQUEST, { email })
      .pipe(
        map(() => {
          return;
        }),
      );
  }

  /**
   * Submits a new password for the supplied reset token.
   *
   * @param token The password-reset token.
   * @param password The new password.
   * @returns The password change observable.
   */
  changePassword(token: string, password: string): Observable<void> {
    const data: ChangePasswordValues = {
      token: token,
      password: password,
    };

    return this._http
      .post(API_URLS.AUTH_RESET_PASSWORD, data, {
        observe: 'response',
        responseType: 'text',
      })
      .pipe(
        map(response => {
          const body = response.body;
          if (!body) {
            return;
          }

          const parsedBody = this.tryParseJson(body);
          if (this.isApiErrorPayload(parsedBody)) {
            throw parsedBody;
          }

          return;
        }),
        catchError(error => {
          const parsedError = this.extractApiErrorPayload(error);
          if (!parsedError) {
            return throwError(() => error);
          }

          return throwError(() => ({
            ...error,
            statusCode:
              typeof parsedError.statusCode === 'number'
                ? parsedError.statusCode
                : error?.status,
            message: parsedError.message,
            error: parsedError,
          }));
        }),
      );
  }

  /**
   * Attempts to parse a JSON string and returns the original value on failure.
   */
  private tryParseJson(payload: string): unknown {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  /**
   * Extracts a backend-style error payload from an HTTP error object.
   */
  private extractApiErrorPayload(error: unknown): {
    statusCode?: number;
    message?: string | string[];
    error?: string;
  } | null {
    const rawPayload =
      typeof error === 'object' && error !== null
        ? (error as { error?: unknown }).error
        : undefined;

    if (typeof rawPayload === 'string') {
      const parsed = this.tryParseJson(rawPayload);
      return this.isApiErrorPayload(parsed)
        ? parsed
        : {
            message: rawPayload,
            statusCode:
              typeof (error as { status?: unknown })?.status === 'number'
                ? ((error as { status: number }).status as number)
                : undefined,
          };
    }

    if (this.isApiErrorPayload(rawPayload)) {
      return rawPayload;
    }

    if (this.isApiErrorPayload(error)) {
      return error;
    }

    return null;
  }

  /**
   * Detects backend-style error payloads that may arrive with a 2xx HTTP status.
   */
  private isApiErrorPayload(payload: unknown): payload is {
    statusCode: number;
    message?: string | string[];
    error?: string;
  } {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const maybeStatusCode = (payload as { statusCode?: unknown }).statusCode;
    return (
      typeof maybeStatusCode === 'number' &&
      Number.isFinite(maybeStatusCode) &&
      maybeStatusCode >= 400
    );
  }

  /**
   * Calculates how many seconds remain before the current session expires.
   *
   * @returns The remaining session lifetime in seconds.
   */
  getSecondsUntilLoginSessionExpiry(): number {
    const expiresAt = Number(localStorage.getItem('expires_at'));
    const now = Date.now();
    return Math.max(0, expiresAt - now) / 1000; // Convert to seconds
  }

  /**
   * Converts a lifetime in seconds into an absolute expiry timestamp.
   *
   * @param seconds The number of seconds to add to the current time.
   * @returns The absolute expiry timestamp in milliseconds.
   */
  getNewExpiresMilliseconds(seconds: number): number {
    return Date.now() + seconds * 1000;
  }

  /**
   * Clears the pending logout timeout.
   */
  clearLogoutTimer(): void {
    if (this.logoutTimeout) {
      clearTimeout(this.logoutTimeout);
      this.logoutTimeout = null;
    }
  }

  /**
   * Recomputes the warning and logout timers from stored expiry values.
   */
  createAutoLogoutTimer(): void {
    this.clearAutoLogoutTimer();
    this.clearLogoutTimer();

    const expiresAt = Number(localStorage.getItem('expires_at'));
    const warningAt = Number(localStorage.getItem('warning_at'));

    // If token is already expired, logout immediately
    if (expiresAt && Date.now() >= expiresAt) {
      this._zone.run(() => {
        this.performLogout();
      });
      return;
    }

    // Set timer to trigger warning
    if (warningAt && Date.now() < warningAt) {
      const delay = warningAt - Date.now();
      this.warningTimeout = setTimeout(() => {
        this._zone.run(() => {
          // Send 0 to signal that the dialog should open immediately
          this._warningAnnouncedSubject.next(0);
        });
      }, delay);
    }

    // Set timer to perform logout
    if (expiresAt && Date.now() < expiresAt) {
      const delay = expiresAt - Date.now();
      this.logoutTimeout = setTimeout(() => {
        this._zone.run(() => {
          this.performLogout();
        });
      }, delay);
    }
  }

  /**
   * Clears the pending warning timeout.
   */
  clearAutoLogoutTimer(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  /**
   * Determines whether the current session is close to expiring.
   *
   * @returns `true` when the remaining session time is below the refresh threshold.
   */
  isTokenExpiringSoon(): boolean {
    const thresholdMins =
      environment.minsBeforeLogoutExpiryToRefreshToken || 15; // Minutes before login session expires if not set in environment settings
    const thresholdSecs = thresholdMins * 60;

    const secondsUntilExpiry = this.getSecondsUntilLoginSessionExpiry();

    return secondsUntilExpiry < thresholdSecs;
  }
}
