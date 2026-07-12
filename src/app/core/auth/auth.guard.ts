import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly _authService = inject(AuthService);
  private readonly _router = inject(Router);

  // NOTE: If we use 'route' in the canActivate, we can remove the eslint comment above it
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (this._authService.isTokenValid()) {
        if (this._authService.isTokenExpiringSoon()) {
          this._authService
            .refreshToken()
            .pipe(
              map(() => true),
              catchError(() => {
                this._router.navigate(['/login'], {
                  queryParams: { returnUrl: state.url },
                });
                resolve(false);
                return [];
              }),
            )
            .subscribe(result => resolve(result));
        } else {
          resolve(true);
        }
      } else {
        this._router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
        resolve(false);
      }
    });
  }
}
