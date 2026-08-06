import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';

/**
 * The Community landing page, introducing the Galactic Personnel Registry and
 * — for a signed-in officer — their friends.
 */
@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class CommunityComponent {
  private readonly _routingService = inject(RoutingService);
  private readonly _authService = inject(AuthService);

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  /**
   * Whether the visitor is signed in, and so has a friends list to link to.
   *
   * @returns True when signed in.
   */
  get isLoggedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
