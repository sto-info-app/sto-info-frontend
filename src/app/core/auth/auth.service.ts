import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map } from 'rxjs';
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
    this.isAuthenticatedSubject.next(!!this.getToken());
  }

  register(user: RegistrationFormValues) {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/login`,
      credentials,
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

  saveToken(token: string) {
    localStorage.setItem('access_token', token);
    this.isAuthenticatedSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  removeToken() {
    localStorage.removeItem('access_token');
    this.isAuthenticatedSubject.next(false);
  }

  performLogout() {
    this.removeToken();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
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
