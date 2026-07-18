import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class HomeComponent implements OnDestroy {
  appTitle: string = environment.appTitle;
  isLoggedIn = false;
  appRoutes = APP_ROUTES;

  private readonly _authService = inject(AuthService);
  private readonly _routingService = inject(RoutingService);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Initializes the component.
   *
   * Subscribes to the authentication service to determine if the user is logged in.
   */
  constructor() {
    this._authService.isAuthenticated$
      .pipe(takeUntil(this._destroy$))
      .subscribe(loggedIn => {
        this.isLoggedIn = loggedIn;
      });
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Returns the link for the given route.
   *
   * @param route The route to get the link for.
   * @returns The link for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
