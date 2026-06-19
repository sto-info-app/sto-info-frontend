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
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  Banner,
  CreateBannerRequest,
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';

/**
 * Admin management for site banners: list, create, edit and delete.
 */
@Component({
  selector: 'app-banner-admin',
  templateUrl: './banner-admin.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class BannerAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly LOAD_TIMEOUT_MS = 12000;

  appRoutes = APP_ROUTES;
  severities = Object.values(NotificationSeverity);
  severityLabels = NOTIFICATION_SEVERITY_LABELS;

  banners: Banner[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  editingId: string | null = null;

  form = this.fb.group({
    severity: [NotificationSeverity.INFO],
    title: ['', [Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.maxLength(500)]],
    linkUrl: ['', [Validators.maxLength(2048)]],
    linkLabel: ['', [Validators.maxLength(80)]],
    dismissible: [true],
    active: [true],
    startsAt: [''],
    endsAt: [''],
  });

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

      this.ngZone.run(() => {
        this.isLoading = false;
        this.banners = [];
        this.errorMessage =
          'Loading banners is taking longer than expected. Please try again.';
        this.cdr.detectChanges();
      });
    }, BannerAdminComponent.LOAD_TIMEOUT_MS);

    this.notificationService
      .getAllBannersForAdmin()
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
        next: banners => {
          this.banners = Array.isArray(banners) ? banners : [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to load banners.';
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Populates the form to edit an existing banner.
   *
   * @param banner - The banner to edit.
   */
  edit(banner: Banner): void {
    this.editingId = banner.id;
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
  }

  /**
   * Resets the form back to create mode.
   */
  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({
      severity: NotificationSeverity.INFO,
      dismissible: true,
      active: true,
      title: '',
      message: '',
      linkUrl: '',
      linkLabel: '',
      startsAt: '',
      endsAt: '',
    });
  }

  /**
   * Saves the form as a new banner or an update.
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    const payload = this.buildPayload();

    const request$ = this.editingId
      ? this.notificationService.updateBanner(this.editingId, payload)
      : this.notificationService.createBanner(payload);

    request$.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
      },
      error: () => (this.errorMessage = 'Failed to save the banner.'),
    });
  }

  /**
   * Deletes a banner after confirmation.
   *
   * @param banner - The banner to delete.
   */
  remove(banner: Banner): void {
    if (!globalThis.confirm?.('Delete this banner?')) {
      return;
    }
    this.notificationService.deleteBanner(banner.id).subscribe({
      next: () => (this.banners = this.banners.filter(b => b.id !== banner.id)),
      error: () => (this.errorMessage = 'Failed to delete the banner.'),
    });
  }

  /**
   * Builds the create/update payload from the form.
   *
   * @returns The banner request payload.
   */
  private buildPayload(): CreateBannerRequest {
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
