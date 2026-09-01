import { CommonModule, formatDate } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import {
  LcarsSearchDialogComponent,
  LcarsSearchDialogData,
} from 'src/app/shared/components/lcars-search-dialog/lcars-search-dialog.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DATE_TIME_WITH_ZONE_FORMAT } from 'src/app/shared/constants/date-formats.constants';
import { memberRoleLabel } from 'src/app/shared/utils/member-role.utils';
import {
  CreateNotificationRequest,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  NotificationTarget,
  UserSearchResult,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { AdminUserSearchService } from '../admin-user-search.service';

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
    MatDialogModule,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class NotificationAdminSendComponent implements OnInit {
  private readonly _fb = inject(FormBuilder);
  private readonly _notificationService = inject(NotificationService);
  private readonly _userSearchService = inject(AdminUserSearchService);
  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Whether the recipient's real name is blurred. Read by the template, so it
   * is public.
   */
  readonly privacyMode = inject(PrivacyModeService);

  appRoutes = APP_ROUTES;
  severities = Object.values(NotificationSeverity);
  severityLabels = NOTIFICATION_SEVERITY_LABELS;
  targets = Object.values(NotificationTarget);
  notificationTarget = NotificationTarget;

  isSaving = false;
  errorMessage = '';
  successMessage = '';
  selectedUser: UserSearchResult | null = null;

  form = this._fb.group({
    target: [NotificationTarget.BROADCAST],
    userId: [''],
    severity: [NotificationSeverity.INFO],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    linkUrl: ['', [Validators.maxLength(2048)]],
  });

  ngOnInit(): void {
    this.loadPrivacyMode();

    this.form.controls.target.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(target => {
        if (target !== NotificationTarget.USER) {
          this.selectedUser = null;
          this.form.controls.userId.setValue('');
        }
      });
  }

  /**
   * Loads the viewer's privacy-mode setting, which decides whether members'
   * real names are blurred here and in the picker.
   *
   * A failure is deliberately silent: the service starts out enabled, so an
   * unreadable setting leaves the names hidden rather than exposing them, and
   * this page's error banner stays free for failures that stop the
   * administrator getting their work done.
   */
  private loadPrivacyMode(): void {
    this.privacyMode
      .load()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({ error: () => undefined });
  }

  /**
   * How the chosen recipient is named on screen: by username, the name they
   * are known by everywhere else on the site.
   *
   * @returns The name, or an empty string when nobody is chosen.
   */
  get recipientName(): string {
    return this.selectedUser?.username ?? '';
  }

  /**
   * The chosen recipient's real name, shown beneath their username for an
   * administrator who knows the person rather than the handle.
   *
   * @returns The name, or an empty string when there is none to show.
   */
  get recipientRealName(): string {
    return this.selectedUser?.fullName ?? '';
  }

  /**
   * When a member last signed in, written the way the member screens write it.
   *
   * @param user - The member.
   * @returns The moment, or `Never` for an account that has never been used.
   */
  private lastSignedIn(user: UserSearchResult): string {
    return user.lastLoginAt
      ? formatDate(user.lastLoginAt, DATE_TIME_WITH_ZONE_FORMAT, 'en-US')
      : 'Never';
  }

  /**
   * Opens the search-and-select dialog for finding a notification recipient.
   *
   * A member is listed by username, with their real name beneath it. No
   * address appears: these notifications are read on the site, and one on the
   * screen that picks their reader read as though an email were about to go
   * out.
   *
   * A real name is personal where a username is not, so the dialog is told to
   * treat it — and what an administrator types to find it — the way Privacy
   * Mode treats personal data everywhere else on the admin screens.
   *
   * Each result also carries the account's role and last sign-in. Usernames
   * repeat and real names repeat harder, and those two facts are what settle
   * which of two similar accounts is the one being written to.
   */
  openUserPicker(): void {
    const data: LcarsSearchDialogData<UserSearchResult> = {
      title: 'Select a Recipient',
      searchFn: (term, page) => this._userSearchService.search(term, page),
      resultLabel: user => user.username,
      resultSublabel: user => user.fullName,
      resultFacts: user => [
        { label: 'Role', value: memberRoleLabel(user) },
        { label: 'Last signed in', value: this.lastSignedIn(user) },
      ],
      pageSize: 5,
      privateTerm: true,
      privateSublabel: true,
    };

    this._dialog
      .open(LcarsSearchDialogComponent<UserSearchResult>, { data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((user?: UserSearchResult) => {
        if (user) {
          this.selectedUser = user;
          this.form.controls.userId.setValue(user.id);
        }
      });
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
