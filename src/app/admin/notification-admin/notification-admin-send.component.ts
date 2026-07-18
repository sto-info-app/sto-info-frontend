import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  CreateNotificationRequest,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';

/**
 * Admin compose form for broadcast or per-user notifications. Sent notifications
 * are reviewed on the separate {@link NotificationAdminListComponent} page.
 */
@Component({
  selector: 'app-notification-admin-send',
  templateUrl: './notification-admin-send.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './notification-admin-send.component.scss',
  ],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class NotificationAdminSendComponent {
  private readonly _fb = inject(FormBuilder);
  private readonly _notificationService = inject(NotificationService);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  appRoutes = APP_ROUTES;
  severities = Object.values(NotificationSeverity);
  severityLabels = NOTIFICATION_SEVERITY_LABELS;
  targets = Object.values(NotificationTarget);
  notificationTarget = NotificationTarget;

  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form = this._fb.group({
    target: [NotificationTarget.BROADCAST],
    userId: [''],
    severity: [NotificationSeverity.INFO],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    linkUrl: ['', [Validators.maxLength(2048)]],
  });

  /**
   * Whether the form currently targets a single user.
   *
   * @returns `true` when the target is USER.
   */
  get isUserTarget(): boolean {
    return this.form.controls.target.value === NotificationTarget.USER;
  }

  /**
   * Sends the composed notification, then routes to the sent list on success.
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
      // `target` and `severity` always have form defaults, so they are never
      // null here (matching the `title`/`body` non-null assertions below).
      target: value.target!,
      severity: value.severity!,
      title: value.title!,
      body: value.body!,
      userId:
        value.target === NotificationTarget.USER
          ? value.userId?.trim()
          : undefined,
      linkUrl: value.linkUrl?.trim() ? value.linkUrl.trim() : undefined,
    };

    this._notificationService
      .createNotification(payload)
      .pipe(
        observeInZone(this._ngZone, this._cdr),
        finalize(() => (this.isSaving = false)),
      )
      .subscribe({
        next: () =>
          this._router.navigate(['/' + APP_ROUTES.ADMIN_NOTIFICATIONS]),
        error: () => (this.errorMessage = 'Failed to send the notification.'),
      });
  }
}
