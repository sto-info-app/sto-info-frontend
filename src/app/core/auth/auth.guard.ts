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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // NOTE: If we use 'route' in the canActivate, we can remove the eslint comment above it
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (this.authService.isTokenValid()) {
        if (this.authService.isTokenExpiringSoon()) {
          this.authService
            .refreshToken()
            .pipe(
              map(() => true),
              catchError(() => {
                this.router.navigate(['/login'], {
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
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
        resolve(false);
      }
    });
  }
}
