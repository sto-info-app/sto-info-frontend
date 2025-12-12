import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, Observable, throwError } from 'rxjs';

import { User } from '../models/user.model';

import { AuthService } from 'src/app/core/auth/auth.service';
import { EditPersonalDetailsFormValues } from 'src/app/models/user-auth.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getUser(): Observable<User> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      // Handle the case when there is no token (e.g., user is not logged in)
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<User>(`${this.apiUrl}/user`, httpOptions);
  }

  updatePersonalDetails(userPersonalDetails: EditPersonalDetailsFormValues) {
    return this.http
      .post(`${this.apiUrl}/user/update-profile`, userPersonalDetails)
      .pipe(
        catchError(error => {
          console.error('Error updating personal details:', error);
          return throwError(() => error);
        }),
      );
  }

  updateProfilePic(profilePicForm: FormData) {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();

    // Remove the Content-Type header if it exists
    if (httpOptions?.headers.has('Content-Type')) {
      httpOptions.headers = httpOptions.headers.delete('Content-Type');
    }

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this.http
      .post(
        `${this.apiUrl}/user/update-profile-pic`,
        profilePicForm,
        httpOptions,
      )
      .pipe(
        catchError(error => {
          console.error('Error updating profile image:', error);
          return throwError(() => error);
        }),
      );
  }
}
