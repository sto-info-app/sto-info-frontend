import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  AppNotification,
  CreateNotificationRequest,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';

/**
 * Admin tool to compose broadcast or per-user notifications and review/delete
 * previously sent ones.
 */
@Component({
  selector: 'app-notification-admin',
  templateUrl: './notification-admin.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class NotificationAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly LOAD_TIMEOUT_MS = 12000;

  appRoutes = APP_ROUTES;
  severities = Object.values(NotificationSeverity);
  severityLabels = NOTIFICATION_SEVERITY_LABELS;
  targets = Object.values(NotificationTarget);
  notificationTarget = NotificationTarget;

  notifications: AppNotification[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    target: [NotificationTarget.BROADCAST],
    userId: [''],
    severity: [NotificationSeverity.INFO],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    linkUrl: ['', [Validators.maxLength(2048)]],
  });

  /**
   * Loads previously sent notifications on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether the form currently targets a single user.
   *
   * @returns `true` when the target is USER.
   */
  get isUserTarget(): boolean {
    return this.form.controls.target.value === NotificationTarget.USER;
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
    }, NotificationAdminComponent.LOAD_TIMEOUT_MS);

    this.notificationService
      .getAllNotificationsForAdmin()
      .pipe(
        take(1),
        finalize(() => {
          this.ngZone.run(() => {
            clearTimeout(loadingTimeout);
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: notifications => {
          this.notifications = Array.isArray(notifications)
            ? notifications
            : [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to load notifications.';
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Sends the composed notification.
   */
  send(): void {
    if (this.isUserTarget && !this.form.controls.userId.value?.trim()) {
      this.form.controls.userId.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const value = this.form.getRawValue();
    const payload: CreateNotificationRequest = {
      target: value.target ?? NotificationTarget.BROADCAST,
      severity: value.severity ?? NotificationSeverity.INFO,
      title: value.title!,
      body: value.body!,
      userId:
        value.target === NotificationTarget.USER
          ? value.userId?.trim()
          : undefined,
      linkUrl: value.linkUrl?.trim() ? value.linkUrl.trim() : undefined,
    };

    this.notificationService
      .createNotification(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Notification sent.';
          this.resetForm();
          this.load();
        },
        error: () => (this.errorMessage = 'Failed to send the notification.'),
      });
  }

  /**
   * Deletes a notification after confirmation.
   *
   * @param notification - The notification to delete.
   */
  remove(notification: AppNotification): void {
    if (!globalThis.confirm?.('Delete this notification?')) {
      return;
    }
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () =>
        (this.notifications = this.notifications.filter(
          n => n.id !== notification.id,
        )),
      error: () => (this.errorMessage = 'Failed to delete the notification.'),
    });
  }

  /**
   * Resets the compose form to its defaults.
   */
  private resetForm(): void {
    this.form.reset({
      target: NotificationTarget.BROADCAST,
      userId: '',
      severity: NotificationSeverity.INFO,
      title: '',
      body: '',
      linkUrl: '',
    });
  }
}
