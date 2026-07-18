import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  standalone: true,
  imports: [RouterModule],
})
export class FooterComponent {
  appTitle = environment.appTitle;
  currentYear: number;
  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  private readonly _routingService = inject(RoutingService);

  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
