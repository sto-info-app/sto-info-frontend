import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DatesTimeHelperService } from 'src/app/shared/services/dates-time-helper.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { User } from '../models/user.model';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  appRoutes = APP_ROUTES;

  user: User | undefined;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private routingService: RoutingService,
    private dateTimeHelper: DatesTimeHelperService,
  ) {}

  ngOnInit() {
    this.dashboardService.getUser().subscribe(user => {
      if (user.isAccountDisabled) this.authService.performLogout();

      this.user = user;
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  timeSinceLastLogin(): string {
    if (!this.user || !this.user.lastLogin) return 'Unknown';
    return this.dateTimeHelper.timeSince(this.user.lastLogin);
  }

  timeSinceLastPasswordReset(): string {
    if (!this.user || !this.user.lastPasswordReset) return 'Unknown';
    return this.dateTimeHelper.timeSince(this.user.lastPasswordReset);
  }

  timeSinceLastUpdated(): string {
    if (!this.user || !this.user.updatedAt) return 'Unknown';
    return this.dateTimeHelper.timeSince(this.user.updatedAt);
  }
}
