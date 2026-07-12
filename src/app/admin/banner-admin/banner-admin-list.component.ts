import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  Banner,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { SEVERITY_META } from 'src/app/shared/constants/notifications.constants';
import { NotificationService } from 'src/app/notifications/notification.service';

const LOAD_TIMEOUT_MS = 12000;

/**
 * Admin listing of all site banners with edit and delete actions.
 */
@Component({
  selector: 'app-banner-admin-list',
  templateUrl: './banner-admin-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './banner-admin-list.component.scss',
  ],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class BannerAdminListComponent implements OnInit {
  private readonly _notificationService = inject(NotificationService);
  private readonly _routingService = inject(RoutingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  appRoutes = APP_ROUTES;
  severityLabels = NOTIFICATION_SEVERITY_LABELS;

  banners: Banner[] = [];
  isLoading = false;
  errorMessage = '';

  /**
   * Loads banners on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads all banners.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.banners = [];
        this.errorMessage =
          'Loading banners is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this._notificationService
      .getAllBannersForAdmin()
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: banners => {
          this.banners = Array.isArray(banners) ? banners : [];
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load banners.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Returns the LCARS severity colour class for a banner, matching the
   * public banner view so the admin list is tinted identically.
   *
   * @param banner - The banner.
   * @returns The severity colour class.
   */
  severityColourClass(banner: Banner): string {
    return (
      SEVERITY_META[banner.severity] ?? SEVERITY_META[NotificationSeverity.INFO]
    ).colourClass;
  }

  /**
   * Returns the Font Awesome icon class for a banner's severity, matching the
   * public banner view.
   *
   * @param banner - The banner.
   * @returns The Font Awesome icon class.
   */
  severityIcon(banner: Banner): string {
    return (
      SEVERITY_META[banner.severity] ?? SEVERITY_META[NotificationSeverity.INFO]
    ).icon;
  }

  /**
   * Builds the edit route link for a banner.
   *
   * @param banner - The banner.
   * @returns The edit route link.
   */
  editLink(banner: Banner): string {
    return this._routingService.getLink(
      `${APP_ROUTES.ADMIN}/banners/${banner.id}/edit`,
    );
  }

  /**
   * Deletes a banner after confirmation.
   *
   * @param banner - The banner to delete.
   */
  remove(banner: Banner): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete Banner',
        message: `
          <p>Are you sure you want to delete this banner?</p>
          <p><strong>WARNING:</strong> This action cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }
        this._notificationService
          .deleteBanner(banner.id)
          .pipe(observeInZone(this._ngZone, this._cdr))
          .subscribe({
            next: () =>
              (this.banners = this.banners.filter(b => b.id !== banner.id)),
            error: () => (this.errorMessage = 'Failed to delete the banner.'),
          });
      });
  }
}
