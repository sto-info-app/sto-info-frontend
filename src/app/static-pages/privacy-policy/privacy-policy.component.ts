import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  standalone: true,
  imports: [RouterModule],
})
export class PrivacyPolicyComponent {
  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;

  private readonly _routingService = inject(RoutingService);

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
