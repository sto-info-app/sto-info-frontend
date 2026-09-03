import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PrivacyModeService } from '../services/privacy-mode.service';
import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  SESSION_TIMEOUT_OPTIONS,
} from 'src/app/shared/constants/session-timeout.constants';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
  ],
})
export class SettingsComponent implements OnInit {
  readonly profileLink = `/${APP_ROUTES.STO_DASHBOARD_PROFILE}`;
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;
  readonly settingsForm = inject(FormBuilder).nonNullable.group({
    privacyMode: false,
    sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
  });
  readonly sessionTimeoutOptions = SESSION_TIMEOUT_OPTIONS;

  isLoading = true;
  isSaving = false;
  errorMessage = '';

  private readonly _privacyModeService = inject(PrivacyModeService);
  private readonly _authService = inject(AuthService);
  private readonly _cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this._privacyModeService.load().subscribe({
      next: settings => {
        this.settingsForm.setValue(settings);
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Unable to load settings.';
        this.isLoading = false;
        this._cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = '';
    const requested = this.settingsForm.getRawValue();
    const timeoutChanged =
      requested.sessionTimeoutMinutes !==
      this._authService.getSessionTimeoutMinutes();

    this._privacyModeService
      .update(requested.privacyMode, requested.sessionTimeoutMinutes)
      .subscribe({
        next: settings => {
          this.settingsForm.setValue(settings);
          this.settingsForm.markAsPristine();
          this.isSaving = false;

          // The session in progress was issued against the old window. Trading
          // it for a new one applies the change now rather than leaving the
          // user on the old timeout until they next sign in.
          if (timeoutChanged) {
            this._authService.refreshToken().subscribe({
              error: () => undefined,
            });
          }

          this._cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Unable to save settings.';
          this.isSaving = false;
          this._cdr.markForCheck();
        },
      });
  }
}
