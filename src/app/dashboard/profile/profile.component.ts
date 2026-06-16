import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { SRC_PHOTO_UNAVAILABLE_300PX } from 'src/app/shared/constants/app-image-assets.constants';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, RouterModule, LoadingBarComponent],
})
export class ProfileComponent implements OnInit, OnDestroy {
  /** Precomputed router link to the main dashboard. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  /** Precomputed router link to the reset-password page. */
  readonly resetPasswordLink = `/${APP_ROUTES.RESET_PASSWORD}`;

  readonly appRouteTitles = APP_ROUTE_TITLES;
  unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  user: User | undefined;

  /** Precomputed activity label, updated on each user data load. */
  lastLoginLabel = '';
  /** Precomputed activity label, updated on each user data load. */
  lastPasswordResetLabel = '';
  /** Precomputed activity label, updated on each user data load. */
  lastUpdatedLabel = '';
  /** Precomputed activity label, updated on each user data load. */
  memberSinceLabel = '';

  private editProfileDialogRef: MatDialogRef<EditPersonalDetailsComponent> | null =
    null;
  private profilePicDialogRef: MatDialogRef<ProfilePicComponent> | null = null;

  private readonly _dashboardService = inject(DashboardService);
  private readonly _authService = inject(AuthService);
  private readonly _routingService = inject(RoutingService);
  private readonly _dateTimeHelper = inject(DatesTimeHelperService);
  private readonly _dialog = inject(MatDialog);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Angular lifecycle hook that initialises the component by loading user data.
   */
  ngOnInit() {
    this.getUserData();
  }

  /**
   * Retrieves the current user data from the dashboard service and updates the local state.
   * Logs the user out if the account is disabled.
   *
   * @returns The most recently cached user data, if available.
   */
  getUserData(): User | undefined {
    this._dashboardService
      .getUser()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: user => {
          if (user.isAccountDisabled) this._authService.performLogout();

          this.user = user;
          this._updateActivityLabels();
          this._cdr.detectChanges();
        },
        error: err => {
          console.warn('Failed to load user (non-200 or network error)', err);
        },
      });
    return this.user;
  }

  /**
   * Resolves a navigation route into a router link string.
   *
   * @param route Application route key.
   * @returns A router link string for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Returns a human-readable description of the time since the user's last login.
   *
   * @returns A formatted relative time string, or 'Never' if no login is recorded.
   */
  timeSinceLastLogin(): string {
    if (!this.user?.lastLoginAt) return 'Never';
    return this._dateTimeHelper.timeSince(this.user.lastLoginAt) || 'Just now';
  }

  /**
   * Returns a human-readable description of the time since the user's last password reset.
   *
   * @returns A formatted relative time string, or 'Never' if no reset is recorded.
   */
  timeSinceLastPasswordReset(): string {
    if (!this.user?.lastPasswordReset) return 'Never';
    return (
      this._dateTimeHelper.timeSince(this.user.lastPasswordReset) || 'Just now'
    );
  }

  /**
   * Returns a human-readable description of the time since the user's profile was last updated.
   *
   * @returns A formatted relative time string, or 'Unknown' if the timestamp is not available.
   */
  timeSinceLastUpdated(): string {
    if (!this.user?.profile?.updatedAt) return 'Unknown';
    return (
      this._dateTimeHelper.timeSince(this.user.profile.updatedAt) || 'Just now'
    );
  }

  /**
   * Returns a human-readable description of the time since the user's profile was created.
   *
   * @returns A formatted relative time string, or 'Unknown' if the timestamp is not available.
   */
  timeSinceUserCreated(): string {
    if (!this.user?.profile?.createdAt) return 'Unknown';
    return (
      this._dateTimeHelper.timeSince(this.user.profile.createdAt) || 'Just now'
    );
  }

  /**
   * Opens the edit personal details dialog and refreshes user data when it closes.
   * Also refreshes the authentication token if the user chooses to stay logged in.
   */
  editUserProfile(): void {
    // Open the edit personal details dialog
    this.editProfileDialogRef = this._dialog.open(
      EditPersonalDetailsComponent,
      {
        hasBackdrop: true,
        disableClose: true,
        width: '75%',
        data: {
          user: this.user,
        },
      },
    );

    // Handle the result (if any action needed)
    this.editProfileDialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(stayLoggedIn => {
        this.getUserData(); // Update the user data

        if (stayLoggedIn) {
          this._authService
            .refreshToken()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              error: err => {
                console.warn('Token refresh failed after profile edit', err);
              },
            });
        }

        // Allow opening the dialog box again
        this.editProfileDialogRef = null;
      });
  }

  /**
   * Opens the profile picture edit dialog and refreshes user data when it closes.
   * Also refreshes the authentication token if the user chooses to stay logged in.
   */
  editUserProfilePhoto(): void {
    // Open the edit personal details dialog
    this.profilePicDialogRef = this._dialog.open(ProfilePicComponent, {
      hasBackdrop: true,
      disableClose: true,
      data: {
        user: this.user,
      },
    });

    // Handle the result (if any action needed)
    this.profilePicDialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(stayLoggedIn => {
        this.getUserData(); // Update the user data

        if (stayLoggedIn) {
          this._authService
            .refreshToken()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              error: err => {
                console.warn(
                  'Token refresh failed after profile photo update',
                  err,
                );
              },
            });
        }

        // Allow opening the dialog box again
        this.profilePicDialogRef = null;
      });
  }

  /**
   * Cleans up subscriptions and closes any open dialogs on component destroy.
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();

    // Close any open dialogs
    if (this.editProfileDialogRef) {
      this.editProfileDialogRef.close();
    }
    if (this.profilePicDialogRef) {
      this.profilePicDialogRef.close();
    }
  }

  /**
   * Fallback handler for profile image load errors that substitutes a default image.
   *
   * @param event Image error event emitted by the browser.
   */
  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.unavailablePhotoSrc;
  }

  /**
   * Recomputes all activity label fields from the current user data.
   * Called after each successful user data load to avoid live template method calls.
   */
  private _updateActivityLabels(): void {
    this.lastLoginLabel = this.timeSinceLastLogin();
    this.lastPasswordResetLabel = this.timeSinceLastPasswordReset();
    this.lastUpdatedLabel = this.timeSinceLastUpdated();
    this.memberSinceLabel = this.timeSinceUserCreated();
  }
}
