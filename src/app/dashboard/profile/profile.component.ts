import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DatesTimeHelperService } from 'src/app/shared/services/dates-time-helper.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { User } from '../models/user.model';
import { DashboardService } from '../services/dashboard.service';
import { EditPersonalDetailsComponent } from './dialogs/edit-personal-details/edit-personal-details.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false,
})
export class ProfileComponent {
  appRoutes = APP_ROUTES;

  user: User | undefined;
  private dialogRef: MatDialogRef<EditPersonalDetailsComponent> | null = null;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
    private readonly routingService: RoutingService,
    private readonly dateTimeHelper: DatesTimeHelperService,
    private readonly dialog: MatDialog,
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

  editUserProfile(): void {
    // Open the edit personal details dialog
    this.dialogRef = this.dialog.open(EditPersonalDetailsComponent, {
      hasBackdrop: true,
      disableClose: true,
      width: '75%',
      data: {
        user: this.user,
      },
    });

    // Handle the result (if any action needed)
    this.dialogRef.afterClosed().subscribe((stayLoggedIn = false) => {
      if (stayLoggedIn) {
        this.authService.refreshToken().subscribe();
      }

      // Allow opening the dialog box again
      this.dialogRef = null;
    });
  }
}
