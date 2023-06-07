import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private isAuthenticatedSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> =
    this.isAuthenticatedSubject.asObservable();

  private expiryAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public expiryAnnounced$: Observable<number> =
    this.expiryAnnouncedSubject.asObservable();

  private warningAnnouncedSubject: ReplaySubject<number> =
    new ReplaySubject<number>(1); // Will replay the last 1 values to new subscribers
  public warningAnnounced$: Observable<number> =
    this.warningAnnouncedSubject.asObservable();

  public autoLogoutWarningMins =
    environment.minsBeforeLogoutExpiryToShowWarning || 5; // 5 minutes before expiration if not set in environment settings
  public autoLogoutWarningSecs = this.autoLogoutWarningMins * 60;
  public autoLogoutWarningMilliSecs = this.autoLogoutWarningSecs * 1000;
  private autoLogoutTimeout: NodeJS.Timeout | null = null;

  private refreshTokenTimeout: NodeJS.Timeout | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Check if there's a login token and update the BehaviorSubject
    this.isAuthenticatedSubject.next(this.isTokenValid());

    // Load any valid token expiry from localStorage and create a timer
    this.createAutoLogoutTimer();
  }

  register(user: RegistrationFormValues) {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
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

  logout() {
    const httpOptions = this.getHttpOptionsWithRefreshToken();
    if (!httpOptions) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError('No token found');
    }
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, httpOptions);
  }

  private getHttpOptionsWithRefreshToken(): { headers: HttpHeaders } | null {
    const token = localStorage.getItem('refresh_token');
    if (!token) {
      return null;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return { headers };
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
    const expiresAt = this.getNewExpriresMilliseconds(expiresIn);
    const warningAt = expiresAt - this.autoLogoutWarningMilliSecs; // The warning time

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('expires_at', expiresAt.toString());
    localStorage.setItem('warning_at', warningAt.toString());

    this.isAuthenticatedSubject.next(true);
    this.expiryAnnouncedSubject.next(expiresAt); // Notify subscribers of the new expiry time
    this.warningAnnouncedSubject.next(warningAt); // Notify subscribers of the new warning time

    this.createRefreshTokenTimer(expiresIn);
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
      return throwError('No token found');
    }
    const body = { refresh_token: refreshToken };
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/refresh`, body)
      .pipe(
        tap(response => {
          this.saveToken(
            response.access_token,
            response.refresh_token,
            response.expires_in,
          );

          const expiresAt = this.getNewExpriresMilliseconds(
            response.expires_in,
          );
          this.expiryAnnouncedSubject.next(expiresAt); // Notify subscribers of the new expiry time
        }),
        catchError(error => {
          this.router.navigate(['/login']);
          return throwError(error);
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
    if (!this.isLoggedIn) {
      return;
    }

    // Send a request to the backend to revoke the refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this.http
        .post(`${this.apiUrl}/auth/logout`, { tokenId: refreshToken })
        .subscribe();
    }

    this.clearRefreshTokenTimer();
    this.removeToken();

    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isTokenValid();
  }

  resetPassword(email: string): Observable<void> {
    const url = `${environment.apiUrl}/auth/request-password-reset`;
    return this.http.post(url, { email }).pipe(
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

    return this.http
      .post(`${environment.apiUrl}/auth/reset-password`, data)
      .pipe(
        map(() => {
          return;
        }),
      );
  }

  getSecondsUntilLoginSessionExpiry(): number {
    const expiresAt = Number(localStorage.getItem('expires_at'));
    const now = new Date().getTime();
    return Math.max(0, expiresAt - now) / 1000; // Convert to seconds
  }

  getNewExpriresMilliseconds(seconds: number): number {
    return Date.now() + seconds * 1000;
  }

  createRefreshTokenTimer(expiresIn: number): void {
    this.clearRefreshTokenTimer();

    // Start a new timer to automatically remove the token when it expires
    this.refreshTokenTimeout = setTimeout(() => {
      if (this.getSecondsUntilLoginSessionExpiry() > 5) {
        this.refreshToken().subscribe();
      }
    }, expiresIn * 1000 - 5000); // Refresh the token 5 seconds before it expires
  }

  clearRefreshTokenTimer(): void {
    // If there's an existing timer, clear it
    if (this.refreshTokenTimeout && this.refreshTokenTimeout !== null) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  createAutoLogoutTimer(): void {
    this.clearAutoLogoutTimer();

    const expiresAt = Number(localStorage.getItem('expires_at'));
    const warningAt = Number(localStorage.getItem('warning_at'));

    if (warningAt && Date.now() < warningAt) {
      // If now is before the warning time, set a timer to trigger the warning
      this.autoLogoutTimeout = setTimeout(() => {
        this.warningAnnouncedSubject.next(Date.now()); // Trigger the warning
      }, warningAt - Date.now());
    }

    if (expiresAt && Date.now() < expiresAt) {
      // If now is before the expiration time, set a timer to perform the logout
      this.refreshTokenTimeout = setTimeout(() => {
        this.performLogout();
      }, expiresAt - Date.now());
    }
  }

  clearAutoLogoutTimer(): void {
    // If there's an existing timer, clear it
    if (this.autoLogoutTimeout && this.autoLogoutTimeout !== null) {
      clearTimeout(this.autoLogoutTimeout);
      this.autoLogoutTimeout = null;
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
