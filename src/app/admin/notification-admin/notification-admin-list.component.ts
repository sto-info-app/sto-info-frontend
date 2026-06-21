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
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  AppNotification,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import {
  LOAD_TIMEOUT_MS,
  SeverityMeta,
  SEVERITY_META,
} from 'src/app/shared/constants/notifications.constants';

/**
 * Admin listing of previously sent notifications, rendered with the same card
 * formatting as the user-facing notifications page, with a delete action.
 */
@Component({
  selector: 'app-notification-admin-list',
  templateUrl: './notification-admin-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './notification-admin-list.component.scss',
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
export class NotificationAdminListComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);

  appRoutes = APP_ROUTES;
  severityLabels = NOTIFICATION_SEVERITY_LABELS;
  notificationTarget = NotificationTarget;

  notifications: AppNotification[] = [];
  isLoading = false;
  errorMessage = '';

  /**
   * Loads previously sent notifications on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads all notifications for review.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this.ngZone.run(() => {
        this.isLoading = false;
        this.notifications = [];
        this.errorMessage =
          'Loading notifications is taking longer than expected. Please try again.';
        this.cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this.notificationService
      .getAllNotificationsForAdmin()
      .pipe(
        take(1),
        observeInZone(this.ngZone, this.cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: notifications => {
          this.notifications = Array.isArray(notifications)
            ? notifications
            : [];
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load notifications.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Deletes a notification after confirmation.
   *
   * @param notification - The notification to delete.
   */
  remove(notification: AppNotification): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete Notification',
        message: `
          <p>Are you sure you want to delete this notification?</p>
          <p><strong>WARNING:</strong> This action cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this.ngZone, this.cdr))
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }
        this.notificationService
          .deleteNotification(notification.id)
          .pipe(observeInZone(this.ngZone, this.cdr))
          .subscribe({
            next: () =>
              (this.notifications = this.notifications.filter(
                n => n.id !== notification.id,
              )),
            error: () =>
              (this.errorMessage = 'Failed to delete the notification.'),
          });
      });
  }

  /**
   * Returns the LCARS colour class and icon for a notification's severity.
   *
   * @param notification - The notification.
   * @returns The severity visual treatment.
   */
  severityMeta(notification: AppNotification): SeverityMeta {
    return (
      SEVERITY_META[notification.severity] ??
      SEVERITY_META[NotificationSeverity.INFO]
    );
  }
}
