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
import { PrivacyModeService } from '../services/privacy-mode.service';

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
  });

  isLoading = true;
  isSaving = false;
  errorMessage = '';

  private readonly _privacyModeService = inject(PrivacyModeService);
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
    this._privacyModeService
      .update(this.settingsForm.getRawValue().privacyMode)
      .subscribe({
        next: settings => {
          this.settingsForm.setValue(settings);
          this.settingsForm.markAsPristine();
          this.isSaving = false;
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
