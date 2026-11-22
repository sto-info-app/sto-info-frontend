import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { GovernancePerson } from 'src/app/models/fleet-governance.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Whose roster data: a Character name and @handle (FC-038). */
export interface RosterErasureTarget {
  readonly characterName: string;
  readonly accountHandle: string;
}

/** A verified erasure, with why. */
export interface RosterErasureRequest extends RosterErasureTarget {
  readonly reason: string;
}

/** What an erasure would touch. */
export interface RosterErasurePreview {
  readonly alreadyErased: boolean;
  readonly rows: number;
  readonly fleets: readonly {
    readonly fleetId: string;
    readonly fleetName: string;
    readonly communityName: string | null;
    readonly rows: number;
  }[];
}

/** An erasure, as the list shows it. It never names who was erased. */
export interface RosterErasure {
  readonly id: string;
  readonly pseudonym: string;
  readonly reason: string;
  readonly admin: GovernancePerson | null;
  readonly replayed: boolean;
  readonly observations: number;
  readonly aliases: number;
  readonly fleets: number;
  readonly createdAt: string;
}

/** An erasure just made, with what became of the files. */
export interface RosterErasureResult extends RosterErasure {
  readonly filesDeleted: number;
  readonly filesPending: number;
}

/**
 * The site admins' verified erasure of roster data (FC-038). The server
 * refuses all of it without the ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class RosterErasureAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Every erasure, newest first.
   *
   * @returns Each.
   */
  list(): Observable<RosterErasure[]> {
    return this.authenticated(options =>
      this._http.get<RosterErasure[]>(API_URLS.ROSTER_ERASURES_ADMIN, options),
    );
  }

  /**
   * What erasing somebody would touch.
   *
   * @param target - Whose.
   * @returns The Fleets naming them.
   */
  preview(target: RosterErasureTarget): Observable<RosterErasurePreview> {
    return this.authenticated(options =>
      this._http.post<RosterErasurePreview>(
        `${API_URLS.ROSTER_ERASURES_ADMIN}/preview`,
        target,
        options,
      ),
    );
  }

  /**
   * Erases somebody's roster data.
   *
   * @param request - Whose, and why.
   * @returns The erasure.
   */
  erase(request: RosterErasureRequest): Observable<RosterErasureResult> {
    return this.authenticated(options =>
      this._http.post<RosterErasureResult>(
        API_URLS.ROSTER_ERASURES_ADMIN,
        request,
        options,
      ),
    );
  }

  /**
   * Sends a request with the access token, or fails without one.
   *
   * @param request - The request.
   * @returns Its response.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return request(options);
  }
}
