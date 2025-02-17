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
  standalone: false,
})
export class ProfileComponent {
  appRoutes = APP_ROUTES;

  user: User | undefined;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
    private readonly routingService: RoutingService,
    private readonly dateTimeHelper: DatesTimeHelperService,
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
    if (!this.user?.lastLoginAt) return 'Never';
    return this.dateTimeHelper.timeSince(this.user.lastLoginAt);
  }

  timeSinceLastPasswordReset(): string {
    if (!this.user?.lastPasswordReset) return 'Never';
    return this.dateTimeHelper.timeSince(this.user.lastPasswordReset);
  }

  timeSinceLastUpdated(): string {
    if (!this.user?.profile?.updatedAt) return 'Unknown';
    return this.dateTimeHelper.timeSince(this.user.profile.updatedAt);
  }
}
