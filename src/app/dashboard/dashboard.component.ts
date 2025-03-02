import { Component, OnInit } from '@angular/core';

import { AuthService } from '../core/auth/auth.service';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../shared/constants/app-image-assets.constants';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';
import { User } from './models/user.model';
import { DashboardService } from './services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false,
})
export class DashboardComponent implements OnInit {
  appRoutes = APP_ROUTES;
  unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  user: User | undefined;
  userGreeting = '';

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
    private readonly routingService: RoutingService,
  ) {}

  ngOnInit() {
    this.dashboardService.getUser().subscribe(user => {
      if (user.isAccountDisabled) this.authService.performLogout();

      this.user = user;
      this.userGreeting = this.displayWelcomeText();
    });
  }

  displayWelcomeText(): string {
    const greetings: string[] = [
      'Welcome',
      'Jolan tru', // Romulan
      'nuqneH', // Klingon (Hello [What do you want])
      'Peldor joi', // Bajoran greeting during the Gratitude Festival
    ];

    const randomGreeting: string =
      greetings[Math.floor(Math.random() * greetings.length)];

    if (this.user?.profile?.lastName)
      return randomGreeting + ', Captain ' + this.user.profile.lastName + '!';
    if (this.user?.profile?.firstName)
      return randomGreeting + ', ' + this.user.profile.firstName + '!';
    return randomGreeting + '!';
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.unavailablePhotoSrc;
  }
}
