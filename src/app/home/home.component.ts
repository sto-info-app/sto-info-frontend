import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
})
export class HomeComponent {
  appTitle: string = environment.appTitle;
  isLoggedIn = false;
  appRoutes = APP_ROUTES;

  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);

  constructor() {
    this.authService.isAuthenticated$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
