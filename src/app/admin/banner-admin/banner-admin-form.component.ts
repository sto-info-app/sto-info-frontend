import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  CreateBannerRequest,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  UpdateBannerRequest,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';

/** Maximum number of characters allowed in a banner message. */
export const BANNER_MESSAGE_MAX_LENGTH = 2000;

/**
 * Create/edit form for a single site banner.
 */
@Component({
  selector: 'app-banner-admin-form',
  templateUrl: './banner-admin-form.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
  ],
})
export class BannerAdminFormComponent implements OnInit {
  private readonly _fb = inject(FormBuilder);
  private readonly _notificationService = inject(NotificationService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  private static readonly _LOAD_TIMEOUT_MS = 12000;

  appRoutes = APP_ROUTES;
  severities = Object.values(NotificationSeverity);
  severityLabels = NOTIFICATION_SEVERITY_LABELS;
  readonly messageMaxLength = BANNER_MESSAGE_MAX_LENGTH;

  bannerId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  form = this._fb.group({
    severity: [NotificationSeverity.INFO],
    title: ['', [Validators.maxLength(120)]],
    message: [
      '',
      [Validators.required, Validators.maxLength(BANNER_MESSAGE_MAX_LENGTH)],
    ],
    linkUrl: ['', [Validators.maxLength(2048)]],
    linkLabel: ['', [Validators.maxLength(80)]],
    dismissible: [true],
    active: [true],
    startsAt: [''],
    endsAt: [''],
  });

  /**
   * Loads the banner for editing when an `id` route parameter is present.
   */
  ngOnInit(): void {
    this.bannerId = this._route.snapshot.paramMap.get('id');
    if (this.bannerId) {
      this.loadBanner(this.bannerId);
    }
  }

  /**
   * Whether the form is in edit mode.
   *
   * @returns `true` when editing an existing banner.
   */
  get isEdit(): boolean {
    return this.bannerId !== null;
  }

  /**
   * Loads an existing banner into the form.
   *
   * @param id - The banner ID.
   */
  private loadBanner(id: string): void {
    this.isLoading = true;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'Loading banner is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, BannerAdminFormComponent._LOAD_TIMEOUT_MS);

    this._notificationService
      .getBannerByIdForAdmin(id)
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: banner => {
          this.isLoading = false;
          if (!banner) {
            this.errorMessage = 'Failed to load the banner.';
            return;
          }

          this.form.patchValue({
            severity: banner.severity,
            title: banner.title ?? '',
            message: banner.message,
            linkUrl: banner.linkUrl ?? '',
            linkLabel: banner.linkLabel ?? '',
            dismissible: banner.dismissible,
            active: banner.active,
            startsAt: this.toInputDate(banner.startsAt),
            endsAt: this.toInputDate(banner.endsAt),
          });
        },
        error: () => {
          this.errorMessage = 'Failed to load the banner.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Submits the form, creating or updating the banner.
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const request$ =
      this.isEdit && this.bannerId
        ? this._notificationService.updateBanner(
            this.bannerId,
            this.buildUpdatePayload(),
          )
        : this._notificationService.createBanner(this.buildCreatePayload());

    request$.pipe(observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => this._router.navigate(['/' + APP_ROUTES.ADMIN_BANNERS]),
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Failed to save the banner.';
      },
    });
  }

  /**
   * Builds the create payload from the form, omitting empty optional fields.
   *
   * @returns The create banner request payload.
   */
  private buildCreatePayload(): CreateBannerRequest {
    const value = this.form.getRawValue();
    return {
      severity: value.severity ?? NotificationSeverity.INFO,
      message: value.message!,
      dismissible: value.dismissible ?? true,
      active: value.active ?? true,
      title: value.title?.trim() ? value.title.trim() : undefined,
      linkUrl: value.linkUrl?.trim() ? value.linkUrl.trim() : undefined,
      linkLabel: value.linkLabel?.trim() ? value.linkLabel.trim() : undefined,
      startsAt: value.startsAt
        ? new Date(value.startsAt).toISOString()
        : undefined,
      endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : undefined,
    };
  }

  /**
   * Builds the update payload from the form. Unset start/end dates are sent as
   * `null` so the backend clears any previously scheduled window.
   *
   * @returns The update banner request payload.
   */
  private buildUpdatePayload(): UpdateBannerRequest {
    const value = this.form.getRawValue();
    return {
      severity: value.severity ?? NotificationSeverity.INFO,
      message: value.message!,
      dismissible: value.dismissible ?? true,
      active: value.active ?? true,
      title: value.title?.trim() ? value.title.trim() : undefined,
      linkUrl: value.linkUrl?.trim() ? value.linkUrl.trim() : undefined,
      linkLabel: value.linkLabel?.trim() ? value.linkLabel.trim() : undefined,
      startsAt: value.startsAt ? new Date(value.startsAt).toISOString() : null,
      endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : null,
    };
  }

  /**
   * Converts an ISO timestamp into a value for a datetime-local input.
   *
   * @param iso - The ISO timestamp or null.
   * @returns The input-friendly value, or empty string.
   */
  private toInputDate(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 16);
  }
}
