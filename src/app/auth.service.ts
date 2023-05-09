import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
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

  register(user: any) {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: any) {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  logout() {
    return this.http.post(`${this.apiUrl}/auth/logout`, {});
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
    return this.logout().subscribe(() => {
      this.removeToken();
      this.router.navigate(['/']);
    });
  }

  isLoggedIn(): boolean {
    //NOTE: Only use when a not wanting automatic updates though using a subscription
    return this.isAuthenticatedSubject.value;
  }

  //TODO:Add more methods as needed for user authentication and handling
}
