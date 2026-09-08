import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Permission } from 'src/app/models/access-control.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { AuthService } from './auth.service';

/**
 * Route guard that permits only users holding the permission named on the
 * route's `data.permission`.
 *
 * Unauthenticated users are sent to the login page with a return URL, matching
 * the existing auth and admin guards. Authenticated users without the
 * permission are sent home rather than shown an error, because a route they
 * cannot use should simply not be somewhere they end up.
 *
 * A route without a declared permission is allowed through: the guard's job is
 * to enforce what the route asks for, and silently denying an unconfigured
 * route would turn a wiring mistake into an outage.
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  private readonly _authService = inject(AuthService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _router = inject(Router);

  /**
   * Determines whether the route can be activated.
   *
   * @param route - The activated route snapshot, read for `data.permission`.
   * @param state - The router state, used to capture the return URL.
   * @returns An observable emitting true when the route may be activated.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    if (!this._authService.isTokenValid()) {
      void this._router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return of(false);
    }

    const required = route.data?.['permission'] as Permission | undefined;

    if (!required) {
      return of(true);
    }

    return this._accessControlService.hasPermission(required).pipe(
      map(isPermitted => {
        if (!isPermitted) {
          void this._router.navigate(['/']);
        }
        return isPermitted;
      }),
      catchError(() => {
        void this._router.navigate([`/${APP_ROUTES.SERVICE_INTERRUPTION}`]);
        return of(false);
      }),
    );
  }
}
