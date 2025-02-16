import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: false,
})
export class HomeComponent {
  appTitle: string = environment.appTitle;
  isLoggedIn = false;
  appRoutes = APP_ROUTES;

  constructor(
    private authService: AuthService,
    private routingService: RoutingService,
  ) {
    this.authService.isAuthenticated$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
