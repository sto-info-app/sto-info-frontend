import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from 'src/app/core/auth/auth.service';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { SRC_PHOTO_UNAVAILABLE_300PX } from 'src/app/shared/constants/app-image-assets.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DatesTimeHelperService } from 'src/app/shared/services/dates-time-helper.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { User } from '../models/user.model';
import { DashboardService } from '../services/dashboard.service';
import { EditPersonalDetailsComponent } from './dialogs/edit-personal-details/edit-personal-details.component';
import { ProfilePicComponent } from './dialogs/profile-pic/profile-pic.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    FontAwesomeModule,
    LoadingBarComponent,
  ],
})
export class ProfileComponent implements OnInit {
  appRoutes = APP_ROUTES;
  unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  user: User | undefined;
  private editProfileDialogRef: MatDialogRef<EditPersonalDetailsComponent> | null =
    null;
  private profilePicDialogRef: MatDialogRef<ProfilePicComponent> | null = null;

  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);
  private readonly dateTimeHelper = inject(DatesTimeHelperService);
  private readonly dialog = inject(MatDialog);

  ngOnInit() {
    this.getUserData();
  }

  getUserData(): User | undefined {
    this.dashboardService.getUser().subscribe(user => {
      if (user.isAccountDisabled) this.authService.performLogout();

      this.user = user;
    });
    return this.user;
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  timeSinceLastLogin(): string {
    if (!this.user?.lastLoginAt) return 'Never';
    return this.dateTimeHelper.timeSince(this.user.lastLoginAt) || 'Just now';
  }

  timeSinceLastPasswordReset(): string {
    if (!this.user?.lastPasswordReset) return 'Never';
    return (
      this.dateTimeHelper.timeSince(this.user.lastPasswordReset) || 'Just now'
    );
  }

  timeSinceLastUpdated(): string {
    if (!this.user?.profile?.updatedAt) return 'Unknown';
    return (
      this.dateTimeHelper.timeSince(this.user.profile.updatedAt) || 'Just now'
    );
  }

  timeSinceUserCreated(): string {
    if (!this.user?.profile?.createdAt) return 'Unknown';
    return (
      this.dateTimeHelper.timeSince(this.user.profile.createdAt) || 'Just now'
    );
  }

  editUserProfile(): void {
    // Open the edit personal details dialog
    this.editProfileDialogRef = this.dialog.open(EditPersonalDetailsComponent, {
      hasBackdrop: true,
      disableClose: true,
      width: '75%',
      data: {
        user: this.user,
      },
    });

    // Handle the result (if any action needed)
    this.editProfileDialogRef.afterClosed().subscribe(stayLoggedIn => {
      this.getUserData(); // Update the user data

      if (stayLoggedIn) {
        this.authService.refreshToken().subscribe();
      }

      // Allow opening the dialog box again
      this.editProfileDialogRef = null;
    });
  }

  editUserProfilePhoto(): void {
    // Open the edit personal details dialog
    this.profilePicDialogRef = this.dialog.open(ProfilePicComponent, {
      hasBackdrop: true,
      disableClose: true,
      width: '75%',
      data: {
        user: this.user,
      },
    });

    // Handle the result (if any action needed)
    this.profilePicDialogRef.afterClosed().subscribe(stayLoggedIn => {
      this.getUserData(); // Update the user data

      if (stayLoggedIn) {
        this.authService.refreshToken().subscribe();
      }

      // Allow opening the dialog box again
      this.profilePicDialogRef = null;
    });
  }

  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.unavailablePhotoSrc;
  }
}
