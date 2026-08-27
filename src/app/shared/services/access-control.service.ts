import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  MyPermissions,
  Permission,
} from 'src/app/models/access-control.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * What the signed-in user is permitted to do.
 *
 * Answers are cached for the session because permissions change rarely and
 * every template that shows a conditional control would otherwise trigger its
 * own request. {@link refresh} clears the cache for the cases that do change
 * it, such as signing in as somebody else.
 *
 * This drives presentation only. Hiding a control is a courtesy to the user,
 * never a protection: the server independently refuses any action the caller
 * is not entitled to, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class AccessControlService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /** The in-flight or completed permission lookup for this session. */
  private _permissions$: Observable<ReadonlySet<string>> | null = null;

  /**
   * Loads the permissions the signed-in user holds.
   *
   * An anonymous caller yields an empty set. Request failures remain errors so
   * route guards can distinguish an unavailable API from a permission denial.
   *
   * @returns An observable of the permission codes held.
   */
  getMyPermissions(): Observable<ReadonlySet<string>> {
    this._permissions$ ??= this.loadPermissions();
    return this._permissions$;
  }

  /**
   * Determines whether the signed-in user holds a permission.
   *
   * @param permission - The permission code to check.
   * @returns An observable emitting true when the permission is held.
   */
  hasPermission(permission: Permission): Observable<boolean> {
    return this.getMyPermissions().pipe(
      map(permissions => permissions.has(permission)),
    );
  }

  /**
   * Discards the cached permissions so the next request reloads them.
   *
   * Call after signing in or out, or after an action that could change what
   * the user may do.
   */
  refresh(): void {
    this._permissions$ = null;
  }

  /**
   * Requests the caller's permissions from the API.
   *
   * @returns An observable of the permission codes held.
   */
  private loadPermissions(): Observable<ReadonlySet<string>> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return of(new Set<string>());
    }

    return this._http
      .get<MyPermissions>(API_URLS.ACCESS_CONTROL_ME, httpOptions)
      .pipe(
        map(response => new Set<string>(response.permissions)),
        // Replayed so the many templates asking about permissions share one
        // response rather than each triggering a request.
        shareReplay({ bufferSize: 1, refCount: false }),
      );
  }
}
