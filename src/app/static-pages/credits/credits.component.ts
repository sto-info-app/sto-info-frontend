import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-credits',
  templateUrl: './credits.component.html',
  standalone: true,
  imports: [RouterModule],
})
export class CreditsComponent {
  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;

  private readonly _routingService = inject(RoutingService);

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
