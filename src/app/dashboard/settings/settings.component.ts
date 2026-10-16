import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  concatMap,
  takeUntil,
  tap,
} from 'rxjs';

import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
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
import {
  PresenceVisibility,
  UserSettings,
  UserSettingsUpdate,
} from '../models/user.model';
import { DEFAULT_USER_SETTINGS } from '../services/user-settings.service';
import { PRESENCE_OPTIONS, SETTING_LABELS } from './settings.constants';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

/** One setting on the page. */
export type SettingKey = keyof UserSettings;

/** How long the "Saved" note stays beside a control, in milliseconds. */
export const SAVED_NOTE_DURATION_MS = 3000;

/** A change to one setting, waiting its turn to be saved. */
interface SettingChange {
  key: SettingKey;
  value: UserSettings[SettingKey];
}

/**
 * The Settings page.
 *
 * Every control saves itself the moment it changes, sending only that field,
 * so a toggle under Notifications and a chooser under Security behave alike
 * and there is no Save button to forget. Changes are saved one at a time in
 * the order they were made: a second change while the first is still on its
 * way waits for it, so the server never hears them out of order.
 *
 * A change that saves earns a brief "Saved" note beside its control. One that
 * fails is put back to the stored value and named in the error at the foot of
 * the page, so the screen never claims something the server did not keep.
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CollapsibleSectionComponent,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
    HelpLinkComponent,
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

  /**
   * Whether the chat preferences are shown: presence, typing and chat's
   * notices (FC-034), which do nothing while chat is off.
   */
  isChatOffered = false;

  isLoading = true;
  errorMessage = '';

  /** The setting whose "Saved" note is showing, if any. */
  savedKey: SettingKey | null = null;

  /**
   * What the page last did, for screen readers.
   *
   * The visible note appears and disappears, which a live region does not
   * always announce; this one stays in the page and only its words change.
   */
  announcement = '';

  private readonly _destroy$ = new Subject<void>();
  private readonly _changes$ = new Subject<SettingChange>();
  private readonly _privacyModeService = inject(PrivacyModeService);
  private readonly _fleetConfigurationService = inject(
    FleetConfigurationService,
  );
  private readonly _authService = inject(AuthService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The settings as the server last confirmed them. */
  private _stored: UserSettings = DEFAULT_USER_SETTINGS;
  private _savedNoteTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this._fleetConfigurationService
      .getFeatures()
      .pipe(takeUntil(this._destroy$))
      .subscribe(features => {
        this.isFleetOffered = features.isEnabled;
        this.isChatOffered = features.chatEnabled;
        this._cdr.markForCheck();
      });

    this._changes$
      .pipe(
        concatMap(change => this._save(change)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    for (const key of Object.keys(this.settingsForm.controls) as SettingKey[]) {
      // Each control's own type is lost in the union; the key says which.
      const control: AbstractControl<UserSettings[SettingKey]> =
        this.settingsForm.controls[key];

      control.valueChanges
        .pipe(takeUntil(this._destroy$))
        .subscribe(value => this._changes$.next({ key, value }));
    }

    this._privacyModeService.load().subscribe({
      next: settings => {
        this._stored = settings;
        // Silently: filling the form in is not the reader changing it.
        this.settingsForm.setValue(settings, { emitEvent: false });
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
    clearTimeout(this._savedNoteTimer);
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

  /**
   * Saves one changed setting.
   *
   * The server insists on hearing the privacy mode with every change, so it
   * travels alongside whichever field changed, as last confirmed.
   *
   * @param change - The setting and its new value.
   * @returns Completes once the change has been saved or put back.
   */
  private _save(change: SettingChange): Observable<unknown> {
    const previous = this._stored;
    const update = {
      privacyMode: previous.privacyMode,
      [change.key]: change.value,
    } as UserSettingsUpdate;
    const timeoutChanged =
      change.key === 'sessionTimeoutMinutes' &&
      change.value !== this._authService.getSessionTimeoutMinutes();

    return this._privacyModeService.update(update).pipe(
      tap(settings => {
        this._stored = settings;
        this.settingsForm.patchValue(
          { [change.key]: settings[change.key] },
          { emitEvent: false },
        );
        this.errorMessage = '';
        this._showSaved(change.key);

        // The session in progress was issued against the old window. Trading
        // it for a new one applies the change now rather than leaving the
        // user on the old timeout until they next sign in.
        if (timeoutChanged) {
          this._authService.refreshToken().subscribe({
            error: () => undefined,
          });
        }

        this._cdr.markForCheck();
      }),
      catchError(() => {
        this.settingsForm.patchValue(
          { [change.key]: previous[change.key] },
          { emitEvent: false },
        );
        this.errorMessage = `Unable to save ${SETTING_LABELS[change.key]}. It has been put back.`;
        this.announcement = this.errorMessage;
        this._cdr.markForCheck();

        return EMPTY;
      }),
    );
  }

  /**
   * Shows the "Saved" note beside a control for a few seconds.
   *
   * @param key - The setting that saved.
   */
  private _showSaved(key: SettingKey): void {
    clearTimeout(this._savedNoteTimer);
    this.savedKey = key;
    this.announcement = `${SETTING_LABELS[key]} saved.`;
    this._savedNoteTimer = setTimeout(() => {
      this.savedKey = null;
      this._cdr.markForCheck();
    }, SAVED_NOTE_DURATION_MS);
  }
}
