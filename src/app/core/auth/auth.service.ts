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
  private readonly isAuthenticatedSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> =
    this.isAuthenticatedSubject.asObservable();

  private readonly expiryAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public expiryAnnounced$: Observable<number> =
    this.expiryAnnouncedSubject.asObservable();

  private readonly warningAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public warningAnnounced$: Observable<number> =
    this.warningAnnouncedSubject.asObservable();

  public autoLogoutWarningMins =
    environment.minsBeforeLogoutExpiryToShowWarning || 5; // 5 minutes before expiration if not set in environment settings
  public autoLogoutWarningSecs = this.autoLogoutWarningMins * 60;
  public autoLogoutWarningMilliSecs = this.autoLogoutWarningSecs * 1000;
  private warningTimeout: ReturnType<typeof setTimeout> | null = null;
  private logoutTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  constructor() {
    // Check if there's a login token and update the BehaviorSubject
    this.isAuthenticatedSubject.next(this.isTokenValid());

    // Load any valid token expiry from localStorage and create a timer
    this.createAutoLogoutTimer();
  }

  register(user: RegistrationFormValues) {
    return this.http.post(API_URLS.AUTH_REGISTER, user);
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
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

  getHttpOptionsWithAccessToken(): { headers: HttpHeaders } | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return { headers };
  }

  saveToken(accessToken: string, refreshToken: string, expiresIn: number) {
    const expiresAt = this.getNewExpiresMilliseconds(expiresIn);
    const warningAt = expiresAt - this.autoLogoutWarningMilliSecs;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('expires_at', expiresAt.toString());
    localStorage.setItem('warning_at', warningAt.toString());

    this.isAuthenticatedSubject.next(true);
    this.expiryAnnouncedSubject.next(expiresAt);
    // Don't announce warning here - let the timer announce it when it fires

    this.createAutoLogoutTimer();
  }

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

  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('warning_at');
    this.isAuthenticatedSubject.next(false);

    // Notify subscribers that the token has expired
    this.expiryAnnouncedSubject.next(0);
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError(() => new Error('No token found'));
    }
    const body = { refresh_token: refreshToken };
    return this.http.post<LoginResponse>(API_URLS.AUTH_REFRESH, body).pipe(
      tap(response => {
        this.saveToken(
          response.access_token,
          response.refresh_token,
          response.expires_in,
        );

        const expiresAt = this.getNewExpiresMilliseconds(response.expires_in);
        this.expiryAnnouncedSubject.next(expiresAt); // Notify subscribers of the new expiry time
      }),
      catchError(error => {
        this.router.navigate([APP_ROUTES.LOGIN]);
        return throwError(() => error);
      }),
    );
  }

  isTokenValid(): boolean {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('expires_at');

    if (!token || !expiresAt) {
      return false;
    }

    return Date.now() < Number(expiresAt);
  }

  performLogout() {
    // Send a request to the backend to revoke the refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this.http
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
    this.expiryAnnouncedSubject.next(0);

    // Get the current URL
    let currentUrl = this.router.url;

    // If we're already on the login page, don't capture it as the returnUrl
    if (currentUrl.includes('/login')) {
      // Try to extract an existing returnUrl if possible
      const urlTree = this.router.parseUrl(currentUrl);
      const existingReturnUrl = urlTree.queryParams['returnUrl'];
      if (existingReturnUrl) {
        currentUrl = existingReturnUrl;
      } else {
        // If no existing returnUrl, just default to empty or home
        currentUrl = '';
      }
    }

    // Navigate to login page with return URL using Angular Router (no page reload)
    this.router.navigate(['/login'], {
      queryParams: currentUrl ? { returnUrl: currentUrl } : {},
    });
  }

  isLoggedIn(): boolean {
    return this.isTokenValid();
  }

  resetPassword(email: string): Observable<void> {
    return this.http.post(API_URLS.AUTH_RESET_PASSWORD_REQUEST, { email }).pipe(
      map(() => {
        return;
      }),
    );
  }

  changePassword(token: string, password: string): Observable<void> {
    const data: ChangePasswordValues = {
      token: token,
      password: password,
    };

    return this.http.post(API_URLS.AUTH_RESET_PASSWORD, data).pipe(
      map(() => {
        return;
      }),
    );
  }

  getSecondsUntilLoginSessionExpiry(): number {
    const expiresAt = Number(localStorage.getItem('expires_at'));
    const now = Date.now();
    return Math.max(0, expiresAt - now) / 1000; // Convert to seconds
  }

  getNewExpiresMilliseconds(seconds: number): number {
    return Date.now() + seconds * 1000;
  }

  clearLogoutTimer(): void {
    if (this.logoutTimeout) {
      clearTimeout(this.logoutTimeout);
      this.logoutTimeout = null;
    }
  }

  createAutoLogoutTimer(): void {
    this.clearAutoLogoutTimer();
    this.clearLogoutTimer();

    const expiresAt = Number(localStorage.getItem('expires_at'));
    const warningAt = Number(localStorage.getItem('warning_at'));

    // If token is already expired, logout immediately
    if (expiresAt && Date.now() >= expiresAt) {
      this.zone.run(() => {
        this.performLogout();
      });
      return;
    }

    // Set timer to trigger warning
    if (warningAt && Date.now() < warningAt) {
      const delay = warningAt - Date.now();
      this.warningTimeout = setTimeout(() => {
        this.zone.run(() => {
          // Send 0 to signal that the dialog should open immediately
          this.warningAnnouncedSubject.next(0);
        });
      }, delay);
    }

    // Set timer to perform logout
    if (expiresAt && Date.now() < expiresAt) {
      const delay = expiresAt - Date.now();
      this.logoutTimeout = setTimeout(() => {
        this.zone.run(() => {
          this.performLogout();
        });
      }, delay);
    }
  }

  clearAutoLogoutTimer(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  isTokenExpiringSoon(): boolean {
    const thresholdMins =
      environment.minsBeforeLogoutExpiryToRefreshToken || 15; // Minutes before login session expires if not set in environment settings
    const thresholdSecs = thresholdMins * 60;

    const secondsUntilExpiry = this.getSecondsUntilLoginSessionExpiry();

    return secondsUntilExpiry < thresholdSecs;
  }
}
