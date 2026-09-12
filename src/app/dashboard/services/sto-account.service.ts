import { HttpClient, HttpParams } from '@angular/common/http';
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
import {
  AccountSortBy,
  AccountSortOrder,
} from 'src/app/shared/utils/account-list.utils';

/**
 * Service to manage STO accounts, platforms, and launchers.
 */
@Injectable({
  providedIn: 'root',
})
export class StoAccountService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  private platforms$?: Observable<Platform[]>;
  private launchers$?: Observable<Launcher[]>;
  private platformLaunchers$?: Observable<PlatformLauncher[]>;

  /**
   * Fetches the current user's STO accounts.
   *
   * The API orders the list, putting pinned accounts first whichever ordering
   * is asked for.
   *
   * @param sortBy Field to order by. Omit to take the API's default of handle.
   * @param sortOrder Direction to order in. Omit to take the API's default of
   * ascending.
   * @returns An observable of STO account array.
   */
  getAccounts(
    sortBy?: AccountSortBy,
    sortOrder?: AccountSortOrder,
  ): Observable<StoAccount[]> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    let params = new HttpParams();
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }

    return this._http.get<StoAccount[]>(API_URLS.STO_ACCOUNT, {
      ...httpOptions,
      params,
    });
  }

  /**
   * Pins or unpins one of the current user's STO accounts, so that it leads
   * their own account list.
   *
   * @param id The account ID.
   * @param pinned True to pin the account, false to unpin it.
   * @returns An observable of the updated STO account.
   */
  setAccountPinned(id: string, pinned: boolean): Observable<StoAccount> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<StoAccount>(
      `${API_URLS.STO_ACCOUNT}/${id}/pin`,
      { pinned },
      httpOptions,
    );
  }

  /**
   * Fetches a specific STO account by ID.
   * @param id The account ID.
   * @returns An observable of the STO account.
   */
  getAccount(id: string): Observable<StoAccount> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.get<StoAccount>(
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
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.post<StoAccount>(
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
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.put<StoAccount>(
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
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this._http.delete<void>(
      `${API_URLS.STO_ACCOUNT}/${id}`,
      httpOptions,
    );
  }

  /**
   * Fetches all available platforms.
   * @returns An observable of platform array.
   */
  getPlatforms(): Observable<Platform[]> {
    this.platforms$ ??= this._http.get<Platform[]>(API_URLS.STO_PLATFORM).pipe(
      shareReplay(1),
      catchError(error => {
        this.platforms$ = undefined;
        console.error('Error fetching platforms:', error);
        return throwError(() => error);
      }),
    );
    return this.platforms$;
  }

  /**
   * Fetches all available launchers.
   * @returns An observable of launcher array.
   */
  getLaunchers(): Observable<Launcher[]> {
    this.launchers$ ??= this._http.get<Launcher[]>(API_URLS.STO_LAUNCHER).pipe(
      shareReplay(1),
      catchError(error => {
        this.launchers$ = undefined;
        console.error('Error fetching launchers:', error);
        return throwError(() => error);
      }),
    );
    return this.launchers$;
  }

  /**
   * Fetches all platform-launcher mappings.
   * @returns An observable of platform-launcher mapping array.
   */
  getPlatformLaunchers(): Observable<PlatformLauncher[]> {
    this.platformLaunchers$ ??= this._http
      .get<PlatformLauncher[]>(API_URLS.STO_PLATFORM_LAUNCHER)
      .pipe(
        shareReplay(1),
        catchError(error => {
          this.platformLaunchers$ = undefined;
          console.error('Error fetching platform-launchers:', error);
          return throwError(() => error);
        }),
      );
    return this.platformLaunchers$;
  }
}
