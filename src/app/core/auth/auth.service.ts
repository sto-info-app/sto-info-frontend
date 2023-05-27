import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
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

  constructor(private http: HttpClient, private router: Router) {
    // Check if there's a login token and update the BehaviorSubject
    this.isAuthenticatedSubject.next(this.isTokenValid());
  }

  register(user: RegistrationFormValues) {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.saveToken(response.access_token, response.expires_in);
        }),
      );
  }

  logout() {
    const httpOptions = this.getHttpOptionsWithToken();
    if (!httpOptions) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return;
    }
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, httpOptions);
  }

  private getHttpOptionsWithToken(): { headers: HttpHeaders } | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return { headers };
  }

  saveToken(token: string, expiresIn: number) {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem('access_token', token);
    localStorage.setItem('expires_at', expiresAt.toString());
    this.isAuthenticatedSubject.next(true);

    // Start a timer to automatically remove the token when it expires
    setTimeout(() => {
      this.removeToken();
    }, expiresIn * 1000);
  }

  getToken(): string | null {
    if (!this.isTokenValid()) {
      // Token is expired or does not exist
      this.removeToken();
      return null;
    }
    // Token exists and is not expired
    return localStorage.getItem('access_token');
  }

  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('expires_at');
    this.isAuthenticatedSubject.next(false);
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
}
