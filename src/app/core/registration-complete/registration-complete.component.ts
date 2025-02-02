import { Component } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';

@Component({
    selector: 'app-registration-complete',
    templateUrl: './registration-complete.component.html',
    styleUrls: ['./registration-complete.component.scss'],
    standalone: false
})
export class RegistrationCompleteComponent {
  appRoutes = APP_ROUTES;

  constructor(private routingService: RoutingService) {}

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
