import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { LoadingBarComponent } from '../shared/components/loading-bar/loading-bar.component';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../shared/constants/app-image-assets.constants';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';
import { User } from './models/user.model';
import { DashboardService } from './services/dashboard.service';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { StoAccountService } from './services/sto-account.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingBarComponent, FontAwesomeModule],
})
export class DashboardComponent implements OnInit {
  appRoutes = APP_ROUTES;
  unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  user: User | undefined;
  userGreeting = '';
  accountsCount = 0;

  private readonly stoAccountService = inject(StoAccountService);

  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);

  ngOnInit() {
    this.dashboardService.getUser().subscribe(user => {
      if (user.isAccountDisabled) this.authService.performLogout();

      this.user = user;
      this.userGreeting = this.displayWelcomeText();
    });

    this.stoAccountService.getAccounts().subscribe(accounts => {
      this.accountsCount = accounts.length;
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
