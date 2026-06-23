import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that only permits authenticated administrators.
 *
 * Non-admins are redirected: unauthenticated users to the login page (with a
 * return URL) and authenticated non-admins to the home page.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Determines whether the route can be activated.
   *
   * @param _route - The activated route snapshot (unused).
   * @param state - The router state, used to capture the return URL.
   * @returns `true` when the user is an authenticated admin.
   */
  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
    if (!this.authService.isTokenValid()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
