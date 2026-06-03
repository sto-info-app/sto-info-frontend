import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';

@Component({
  selector: 'app-registration-complete',
  templateUrl: './registration-complete.component.html',
  styleUrls: ['./registration-complete.component.scss'],
  standalone: true,
  imports: [RouterModule],
})
export class RegistrationCompleteComponent {
  appRoutes = APP_ROUTES;

  private readonly routingService = inject(RoutingService);

  /**
   * Resolves a route key into a router link.
   *
   * @param route The route key.
   * @returns The resolved link.
   */
  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
