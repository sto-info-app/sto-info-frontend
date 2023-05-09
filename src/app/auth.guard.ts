import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
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
