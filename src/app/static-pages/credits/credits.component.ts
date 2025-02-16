import { Component } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-credits',
  templateUrl: './credits.component.html',
  standalone: false,
})
export class CreditsComponent {
  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;

  constructor(private routingService: RoutingService) {}

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
