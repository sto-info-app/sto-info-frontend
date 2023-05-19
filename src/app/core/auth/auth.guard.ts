import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  // NOTE: If we use route or state in the canActivate, we can remove the eslint comment above
  canActivate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    route: ActivatedRouteSnapshot,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    state: RouterStateSnapshot,
  ): boolean | Observable<boolean> | Promise<boolean> {
    const token = this.authService.getToken();

    if (token) {
      // The user is authenticated, and canActivate returns true
      return true;
    } else {
      // The user is not authenticated, canActivate returns false and redirects to the login page
      this.router.navigate(['/login']);
      return false;
    }
  }
}
