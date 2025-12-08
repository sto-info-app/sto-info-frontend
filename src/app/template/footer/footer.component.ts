import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
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
  appVersion = environment.version;
  currentYear: number;
  appRoutes = APP_ROUTES;

  constructor(private readonly routingService: RoutingService) {
    this.currentYear = new Date().getFullYear();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
