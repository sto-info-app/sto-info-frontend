import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  PATREON_URL,
  SOCIAL_MEDIA_ROUTES,
} from 'src/app/shared/constants/external-routes.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  standalone: true,
  imports: [RouterModule],
})
export class AboutComponent {
  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;
  socialMediaRoutes = SOCIAL_MEDIA_ROUTES;
  patreonUrl = PATREON_URL;

  private readonly routingService = inject(RoutingService);

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
