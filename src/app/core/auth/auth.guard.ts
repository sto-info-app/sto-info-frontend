import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  // NOTE: If we use 'route' in the canActivate, we can remove the eslint comment above it
  canActivate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | Observable<boolean> | Promise<boolean> {
    if (this.authService.isTokenValid()) {
      if (this.authService.isTokenExpiringSoon()) {
        return this.authService.refreshToken().pipe(
          map(() => true),
          catchError(() => {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: state.url },
            });
            return of(false);
          }),
        );
      }
      return true;
    } else {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }
  }
}
