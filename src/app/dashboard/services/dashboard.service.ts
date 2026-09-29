import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, Observable, throwError } from 'rxjs';

import {
  User,
  UserProfileUpdateResult,
  UserSettings,
  UserSettingsUpdate,
} from '../models/user.model';

import { AuthService } from 'src/app/core/auth/auth.service';
import { EditPersonalDetailsFormValues } from 'src/app/models/user-auth.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

/** What closing the account does to one Community the user owns (FC-038). */
export interface OwnedCommunityOutcome {
  readonly communityId: string;
  readonly name: string;
  /** Handed to an Admin, or closed because none can take it. */
  readonly outcome: 'TRANSFER' | 'CLOSE';
  readonly toUserId: string | null;
  readonly toUsername: string | null;
}

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

  getUserSettings(): Observable<UserSettings> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<UserSettings>(API_URLS.USER_SETTINGS, httpOptions);
  }

  updateUserSettings(settings: UserSettingsUpdate): Observable<UserSettings> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<UserSettings>(
      API_URLS.USER_SETTINGS,
      settings,
      httpOptions,
    );
  }

  updatePersonalDetails(
    userPersonalDetails: EditPersonalDetailsFormValues,
  ): Observable<UserProfileUpdateResult> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http
      .post<UserProfileUpdateResult>(
        API_URLS.UPDATE_USER_PROFILE,
        userPersonalDetails,
        httpOptions,
      )
      .pipe(
        catchError(error => {
          console.error('Error updating personal details:', error);
          return throwError(() => error);
        }),
      );
  }

  updateProfilePic(profilePicForm: FormData): Observable<AcceptedAsset> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    // Remove the Content-Type header if it exists
    if (httpOptions?.headers.has('Content-Type')) {
      httpOptions.headers = httpOptions.headers.delete('Content-Type');
    }

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http
      .post<AcceptedAsset>(
        API_URLS.UPDATE_USER_PROFILE_PIC,
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

  /**
   * What closing the account would do to each open Fleet Community the user
   * owns (FC-038).
   *
   * @returns Each, and whether it goes to an Admin or is closed.
   */
  closurePreview(): Observable<OwnedCommunityOutcome[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this._http.get<OwnedCommunityOutcome[]>(
      API_URLS.CLOSE_ACCOUNT_COMMUNITIES,
      httpOptions,
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
