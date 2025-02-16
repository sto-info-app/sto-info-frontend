import { Component } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  standalone: false,
})
export class FooterComponent {
  appTitle = environment.appTitle;
  appVersion = environment.version;
  currentYear: number;
  appRoutes = APP_ROUTES;

  constructor(private routingService: RoutingService) {
    this.currentYear = new Date().getFullYear();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
