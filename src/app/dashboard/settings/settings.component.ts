import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import {
  availableTimezones,
  describeTimezone,
  deviceTimezone,
} from 'src/app/shared/utils/timezone.utils';
import { PrivacyModeService } from '../services/privacy-mode.service';
import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  SESSION_TIMEOUT_OPTIONS,
} from 'src/app/shared/constants/session-timeout.constants';
import { PresenceVisibility } from '../models/user.model';

/** The presence audiences, and how the page describes each one. */
const PRESENCE_OPTIONS: readonly {
  value: PresenceVisibility;
  label: string;
}[] = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends only' },
  { value: 'FLEETS_AND_ARMADAS', label: 'My Fleets and Armadas' },
];

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
export class SettingsComponent implements OnInit, OnDestroy {
  readonly profileLink = `/${APP_ROUTES.STO_DASHBOARD_PROFILE}`;
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;
  readonly customTrackingLink = `/${APP_ROUTES.STO_DASHBOARD_CUSTOM_TRACKING}`;

  readonly settingsForm = inject(FormBuilder).nonNullable.group({
    privacyMode: false,
    sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    displayTimezone: null as string | null,
    stoExportTimezone: null as string | null,
    presenceVisibility: 'FRIENDS' as PresenceVisibility,
    appearOffline: false,
    typingIndicatorsEnabled: false,
    notifyMention: true,
    notifyReply: true,
    notifyDirectMessage: true,
    notifyRosterAssociation: true,
    notifyEventReminder: true,
  });

  readonly sessionTimeoutOptions = SESSION_TIMEOUT_OPTIONS;
  readonly presenceOptions = PRESENCE_OPTIONS;
  readonly timezones = availableTimezones();

  /**
   * The zone this device is in, named in the "automatic" option.
   *
   * Read once and shown, so that choosing to follow the device is an informed
   * choice rather than a shrug.
   */
  readonly deviceTimezoneLabel = describeTimezone(deviceTimezone());

  /**
   * Whether the Fleet preferences are shown.
   *
   * They describe presence, typing and roster imports, none of which exist
   * until Fleet Community is switched on. Hidden rather than disabled, which is
   * how the rest of the site treats a feature that is off: a greyed-out control
   * advertises something that is not there yet.
   */
  isFleetOffered = false;

  isLoading = true;
  isSaving = false;
  errorMessage = '';

  private readonly _destroy$ = new Subject<void>();
  private readonly _privacyModeService = inject(PrivacyModeService);
  private readonly _fleetConfigurationService = inject(
    FleetConfigurationService,
  );
  private readonly _authService = inject(AuthService);
  private readonly _cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this._fleetConfigurationService
      .getFeatures()
      .pipe(takeUntil(this._destroy$))
      .subscribe(features => {
        this.isFleetOffered = features.isEnabled;
        this._cdr.markForCheck();
      });

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

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Describes a timezone for the picker.
   *
   * @param timezone - The IANA identifier.
   * @returns The identifier with its current offset.
   */
  describe(timezone: string): string {
    return describeTimezone(timezone);
  }

  save(): void {
    if (this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = '';
    const requested = this.settingsForm.getRawValue();
    const timeoutChanged =
      requested.sessionTimeoutMinutes !==
      this._authService.getSessionTimeoutMinutes();

    this._privacyModeService.update(requested).subscribe({
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
