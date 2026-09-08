import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AdminPermission,
  SetPermissionOverrideRequest,
  SetUserRoleRequest,
  UserAccessSummary,
} from 'src/app/models/access-control.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The administrator's side of access control: reading what one member may do,
 * setting the role their baseline comes from, and granting or withholding
 * individual permissions on top of it.
 *
 * Separate from {@link AccessControlService}, which answers "what may *I* do"
 * for the signed-in user and caches its answer for the session. Nothing here is
 * cached: an administrator changing overrides needs to see the result of the
 * change they just made, not the answer from before it.
 *
 * Every route is refused server-side without the ADMIN role. The role is
 * deliberately not a permission — gating the permission system behind a
 * permission it also governs would mean one mistaken override could leave
 * nobody able to correct it.
 */
@Injectable({
  providedIn: 'root',
})
export class AccessControlAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists every permission the application recognises.
   *
   * @returns An observable of the known permissions, ordered by module then code.
   */
  listPermissions(): Observable<AdminPermission[]> {
    return this.authenticated<AdminPermission[]>(options =>
      this._http.get<AdminPermission[]>(
        API_URLS.ACCESS_CONTROL_ADMIN_PERMISSIONS,
        options,
      ),
    );
  }

  /**
   * Reports what a member may currently do and which overrides say so.
   *
   * @param userId - The member to describe.
   * @returns An observable of the member's access summary.
   */
  getUserAccessSummary(userId: string): Observable<UserAccessSummary> {
    return this.authenticated<UserAccessSummary>(options =>
      this._http.get<UserAccessSummary>(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${userId}`,
        options,
      ),
    );
  }

  /**
   * Grants or withholds a single permission for a member.
   *
   * Re-applying the same permission code replaces the existing override rather
   * than adding a second one, so repeating the request is harmless.
   *
   * @param userId - The member the override applies to.
   * @param payload - The permission code, the effect and the recorded reason.
   * @returns An observable of the member's updated access summary.
   */
  setPermissionOverride(
    userId: string,
    payload: SetPermissionOverrideRequest,
  ): Observable<UserAccessSummary> {
    return this.authenticated<UserAccessSummary>(options =>
      this._http.post<UserAccessSummary>(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${userId}/permission-overrides`,
        payload,
        options,
      ),
    );
  }

  /**
   * Gives a member a role.
   *
   * Only the roles in `ASSIGNABLE_ROLES` are offered. The administrator role is
   * granted outside the application, and the API refuses both a request naming
   * it and any request against a member who already holds it.
   *
   * @param userId - The member whose role is changing.
   * @param payload - The role to give them.
   * @returns An observable of the member's updated access summary.
   */
  setUserRole(
    userId: string,
    payload: SetUserRoleRequest,
  ): Observable<UserAccessSummary> {
    return this.authenticated<UserAccessSummary>(options =>
      this._http.put<UserAccessSummary>(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${userId}/role`,
        payload,
        options,
      ),
    );
  }

  /**
   * Withdraws an override, returning the member to whatever their role confers.
   *
   * @param userId - The member the override applies to.
   * @param permissionCode - The permission code to stop overriding.
   * @returns An observable of the member's updated access summary.
   */
  removePermissionOverride(
    userId: string,
    permissionCode: string,
  ): Observable<UserAccessSummary> {
    return this.authenticated<UserAccessSummary>(options =>
      this._http.delete<UserAccessSummary>(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${userId}/permission-overrides/${encodeURIComponent(permissionCode)}`,
        options,
      ),
    );
  }

  // ----- Helpers -----

  /**
   * Runs a request with the access token attached, or fails when there is none.
   *
   * @param request - Builds the request from the resolved HTTP options.
   * @returns The request's observable, or one that errors when signed out.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return request(httpOptions);
  }
}
