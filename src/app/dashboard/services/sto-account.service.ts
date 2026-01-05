import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, Observable, shareReplay, throwError } from 'rxjs';

import {
  CreateStoAccountRequest,
  Launcher,
  Platform,
  PlatformLauncher,
  StoAccount,
  UpdateStoAccountRequest,
} from '../models/sto-account.model';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Service to manage STO accounts, platforms, and launchers.
 */
@Injectable({
  providedIn: 'root',
})
export class StoAccountService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private platforms$?: Observable<Platform[]>;
  private launchers$?: Observable<Launcher[]>;
  private platformLaunchers$?: Observable<PlatformLauncher[]>;

  /**
   * Fetches the current user's STO accounts.
   * @returns An observable of STO account array.
   */
  getAccounts(): Observable<StoAccount[]> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<StoAccount[]>(API_URLS.STO_ACCOUNT, httpOptions);
  }

  /**
   * Fetches a specific STO account by ID.
   * @param id The account ID.
   * @returns An observable of the STO account.
   */
  getAccount(id: string): Observable<StoAccount> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<StoAccount>(
      `${API_URLS.STO_ACCOUNT}/${id}`,
      httpOptions,
    );
  }

  /**
   * Creates a new STO account.
   * @param account The account data.
   * @returns An observable of the created STO account.
   */
  createAccount(account: CreateStoAccountRequest): Observable<StoAccount> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<StoAccount>(
      API_URLS.STO_ACCOUNT,
      account,
      httpOptions,
    );
  }

  /**
   * Updates an existing STO account.
   * @param id The account ID.
   * @param account The updated account data.
   * @returns An observable of the updated STO account.
   */
  updateAccount(
    id: string,
    account: UpdateStoAccountRequest,
  ): Observable<StoAccount> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.put<StoAccount>(
      `${API_URLS.STO_ACCOUNT}/${id}`,
      account,
      httpOptions,
    );
  }

  /**
   * Deletes an STO account.
   * @param id The account ID.
   * @returns An observable of the deletion result.
   */
  deleteAccount(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.delete<void>(`${API_URLS.STO_ACCOUNT}/${id}`, httpOptions);
  }

  /**
   * Fetches all available platforms.
   * @returns An observable of platform array.
   */
  getPlatforms(): Observable<Platform[]> {
    if (!this.platforms$) {
      this.platforms$ = this.http.get<Platform[]>(API_URLS.STO_PLATFORM).pipe(
        shareReplay(1),
        catchError(error => {
          this.platforms$ = undefined;
          console.error('Error fetching platforms:', error);
          return throwError(() => error);
        }),
      );
    }
    return this.platforms$;
  }

  /**
   * Fetches all available launchers.
   * @returns An observable of launcher array.
   */
  getLaunchers(): Observable<Launcher[]> {
    if (!this.launchers$) {
      this.launchers$ = this.http.get<Launcher[]>(API_URLS.STO_LAUNCHER).pipe(
        shareReplay(1),
        catchError(error => {
          this.launchers$ = undefined;
          console.error('Error fetching launchers:', error);
          return throwError(() => error);
        }),
      );
    }
    return this.launchers$;
  }

  /**
   * Fetches all platform-launcher mappings.
   * @returns An observable of platform-launcher mapping array.
   */
  getPlatformLaunchers(): Observable<PlatformLauncher[]> {
    if (!this.platformLaunchers$) {
      this.platformLaunchers$ = this.http
        .get<PlatformLauncher[]>(API_URLS.STO_PLATFORM_LAUNCHER)
        .pipe(
          shareReplay(1),
          catchError(error => {
            this.platformLaunchers$ = undefined;
            console.error('Error fetching platform-launchers:', error);
            return throwError(() => error);
          }),
        );
    }
    return this.platformLaunchers$;
  }
}
