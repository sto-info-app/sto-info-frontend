import { Component, Input, inject } from '@angular/core';
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
  /**
   * Whether to offer Storytime in the footer.
   *
   * Supplied from above rather than fetched here, matching the sidebar. The
   * footer renders on every page and in most component tests, so giving it an
   * HTTP dependency would make it expensive to render and awkward to test
   * everywhere it appears.
   *
   * Defaults to hidden so the link never flickers into view before the feature
   * state is known.
   */
  @Input() isStorytimeEnabled = false;

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
