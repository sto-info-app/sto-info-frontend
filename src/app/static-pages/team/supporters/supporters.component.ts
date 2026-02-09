import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { PATREON_URL } from 'src/app/shared/constants/external-routes.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { SUPPORTERS } from '../team.data';

@Component({
  selector: 'app-team-supporters',
  templateUrl: './supporters.component.html',
  styleUrls: ['./supporters.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class TeamSupportersComponent {
  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;
  appTitle = environment.appTitle;
  patreonUrl = PATREON_URL;

  currentSupporters = SUPPORTERS.filter(
    supporter => supporter.status === 'current',
  );
  pastSupporters = SUPPORTERS.filter(supporter => supporter.status === 'past');

  private readonly routingService = inject(RoutingService);

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
