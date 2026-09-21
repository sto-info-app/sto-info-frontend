import { AsyncPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Observable } from 'rxjs';

import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  standalone: true,
  imports: [AsyncPipe, RouterModule],
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
   *
   * Offered is not the same as working. Only the server saying the feature is
   * off takes these entries away; a backend that could not be reached leaves
   * them, because following one is how a visitor learns there is an outage.
   */
  @Input() isStorytimeOffered = false;

  /**
   * Whether to offer the Fleet section in the footer.
   *
   * Asked here rather than handed down, matching the sidebar: the Fleet
   * configuration is fetched once and shared for the lifetime of the
   * application, so depending on it is cheap wherever it is needed, and
   * one mechanism serves every entry point rather than two.
   */
  readonly isFleetOffered$: Observable<boolean>;

  appTitle = environment.appTitle;
  currentYear: number;
  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  private readonly _routingService = inject(RoutingService);
  private readonly _fleetConfiguration = inject(FleetConfigurationService);

  constructor() {
    this.currentYear = new Date().getFullYear();
    this.isFleetOffered$ = this._fleetConfiguration.isOffered();
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
