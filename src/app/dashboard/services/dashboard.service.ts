import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { User } from '../models/user.model';

import { AuthService } from 'src/app/core/auth/auth.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  getUser(): Observable<User> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<User>(`${this.apiUrl}/user`, httpOptions);
  }
}
