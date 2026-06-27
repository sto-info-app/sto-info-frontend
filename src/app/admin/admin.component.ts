import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';

/**
 * Admin landing page linking to the content-management areas. This is the
 * lightweight in-app replacement for a separate admin portal.
 */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [RouterModule],
})
export class AdminComponent {
  private readonly routingService = inject(RoutingService);

  appRoutes = APP_ROUTES;

  /**
   * Builds a router link for a route key.
   *
   * @param route - The route path.
   * @returns The absolute link.
   */
  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
