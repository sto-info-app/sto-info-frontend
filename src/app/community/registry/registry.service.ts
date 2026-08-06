import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  PaginatedRegistryProfiles,
  RegistryAccount,
  RegistryCharacter,
  RegistryProfile,
  RegistryQuery,
} from '../models/registry.models';

/**
 * Reads the public Galactic Personnel Registry.
 *
 * Every endpoint here works anonymously, so unlike the dashboard services a
 * missing token is not an error. The token is still attached when the viewer
 * happens to be signed in: the server uses it to hide members they have
 * blocked or been blocked by, and to report how they relate to the member
 * they are viewing.
 */
@Injectable({
  providedIn: 'root',
})
export class RegistryService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists publicly visible registry members.
   *
   * @param query - Optional search, sort and pagination options.
   * @returns An observable of the paginated members.
   */
  getProfiles(
    query: RegistryQuery = {},
  ): Observable<PaginatedRegistryProfiles> {
    return this._http.get<PaginatedRegistryProfiles>(
      API_URLS.REGISTRY_PROFILES,
      { ...this.viewerOptions(), params: this.buildQueryParams(query) },
    );
  }

  /**
   * Fetches a single registry member by their profile username.
   *
   * @param username - The member's profile username.
   * @returns An observable of the member's public profile.
   */
  getProfile(username: string): Observable<RegistryProfile> {
    return this._http.get<RegistryProfile>(
      `${API_URLS.REGISTRY_PROFILES}/${encodeURIComponent(username)}`,
      this.viewerOptions(),
    );
  }

  /**
   * Fetches a publicly visible STO account.
   *
   * @param username - The owning member's profile username.
   * @param accountSlug - The account's URL slug.
   * @returns An observable of the account's public detail view.
   */
  getAccount(
    username: string,
    accountSlug: string,
  ): Observable<RegistryAccount> {
    return this._http.get<RegistryAccount>(
      `${API_URLS.REGISTRY_PROFILES}/${encodeURIComponent(
        username,
      )}/${encodeURIComponent(accountSlug)}`,
      this.viewerOptions(),
    );
  }

  /**
   * Fetches a publicly visible captain.
   *
   * @param username - The owning member's profile username.
   * @param accountSlug - The owning account's URL slug.
   * @param characterSlug - The captain's URL slug.
   * @returns An observable of the captain's public detail view.
   */
  getCharacter(
    username: string,
    accountSlug: string,
    characterSlug: string,
  ): Observable<RegistryCharacter> {
    return this._http.get<RegistryCharacter>(
      `${API_URLS.REGISTRY_PROFILES}/${encodeURIComponent(
        username,
      )}/${encodeURIComponent(accountSlug)}/${encodeURIComponent(
        characterSlug,
      )}`,
      this.viewerOptions(),
    );
  }

  /**
   * The request options carrying the viewer's access token, if they have one.
   *
   * @returns The auth headers when signed in, otherwise an empty options bag.
   */
  private viewerOptions(): Record<string, unknown> {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }

  /**
   * Builds the query string, omitting any unset value.
   *
   * @param query - The registry query.
   * @returns The HTTP params to send.
   */
  private buildQueryParams(query: RegistryQuery): HttpParams {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return params;
  }
}
