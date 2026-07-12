import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, Observable, throwError } from 'rxjs';

import { User } from '../models/user.model';

import { AuthService } from 'src/app/core/auth/auth.service';
import { EditPersonalDetailsFormValues } from 'src/app/models/user-auth.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  getUser(): Observable<User> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<User>(API_URLS.USER, httpOptions);
  }

  updatePersonalDetails(userPersonalDetails: EditPersonalDetailsFormValues) {
    return this._http
      .post(API_URLS.UPDATE_USER_PROFILE, userPersonalDetails)
      .pipe(
        catchError(error => {
          console.error('Error updating personal details:', error);
          return throwError(() => error);
        }),
      );
  }

  updateProfilePic(profilePicForm: FormData) {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    // Remove the Content-Type header if it exists
    if (httpOptions?.headers.has('Content-Type')) {
      httpOptions.headers = httpOptions.headers.delete('Content-Type');
    }

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http
      .post(API_URLS.UPDATE_USER_PROFILE_PIC, profilePicForm, httpOptions)
      .pipe(
        catchError(error => {
          console.error('Error updating profile image:', error);
          return throwError(() => error);
        }),
      );
  }

  closeAccount() {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.delete<{ success: boolean }>(
      API_URLS.CLOSE_ACCOUNT,
      httpOptions,
    );
  }
}
