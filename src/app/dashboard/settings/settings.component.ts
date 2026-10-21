import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  afterEveryRender,
  inject,
  viewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_ANCHORS,
  SETTINGS_TABS,
  SettingsTab,
} from 'src/app/shared/constants/settings-links.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import {
  availableTimezones,
  describeTimezone,
  deviceTimezone,
} from 'src/app/shared/utils/timezone.utils';
import { DashboardService } from '../services/dashboard.service';
import { PrivacyModeService } from '../services/privacy-mode.service';
import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  SESSION_TIMEOUT_OPTIONS,
} from 'src/app/shared/constants/session-timeout.constants';
import {
  PresenceVisibility,
  UserProfile,
  UserSettings,
  UserSettingsUpdate,
} from '../models/user.model';
import { DEFAULT_USER_SETTINGS } from '../services/user-settings.service';
import {
  PRESENCE_OPTIONS,
  REGISTRY_LABEL,
  SETTING_LABELS,
  SETTINGS_TAB_LABELS,
} from './settings.constants';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

/** One setting on the page. */
export type SettingKey = keyof UserSettings;

/** The registry switch, which is the profile's rather than a setting. */
export const REGISTRY_KEY = 'publiclyVisible';

/** Anything on the page that can say it saved. */
export type SavedKey = SettingKey | typeof REGISTRY_KEY;

/** How long the "Saved" note stays beside a control, in milliseconds. */
export const SAVED_NOTE_DURATION_MS = 3000;

/** How long a setting a link led to stays marked, in milliseconds. */
export const SETTING_MARK_DURATION_MS = 2000;

/** The class that marks it. */
export const SETTING_MARK_CLASS = 'settings-marked';

/** A change to one setting, waiting its turn to be saved. */
interface SettingChange {
  key: SettingKey;
  value: UserSettings[SettingKey];
}

/** Where the registry switch stands. */
type RegistryState = 'loading' | 'ready' | 'failed';

/**
 * The Settings page, in tabs: Account, Chat, Fleet, Notifications and Custom
 * Tracking. Chat's tab shows only while chat is on, and Fleet's and
 * Notifications' only while Fleet Community is.
 *
 * The address names the tab, `?tab=chat`, and may name a setting on it,
 * `#setting-typing`: the cogs around the site lead there, and the page opens
 * the section holding that setting, scrolls to it, focuses it and marks it
 * for a moment. An address naming a tab that is not shown opens Account.
 *
 * Every control saves itself the moment it changes, sending only that field,
 * so a toggle under Notifications and a chooser under Security behave alike
 * and there is no Save button to forget. Changes are saved one at a time in
 * the order they were made: a second change while the first is still on its
 * way waits for it, so the server never hears them out of order.
 *
 * The registry switch belongs to the profile, so it is saved with the rest of
 * the personal details as they stand, the same as the Personnel Record's edit
 * dialog saves it.
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

  /** "Show me in the Galactic Personnel Registry". */
  readonly registryControl = new FormControl(false, { nonNullable: true });

  readonly sessionTimeoutOptions = SESSION_TIMEOUT_OPTIONS;
  readonly presenceOptions = PRESENCE_OPTIONS;
  readonly timezones = availableTimezones();
  readonly anchors = SETTINGS_ANCHORS;
  readonly tabLabels = SETTINGS_TAB_LABELS;
  readonly registryLabel = REGISTRY_LABEL;

  /**
   * The zone this device is in, named in the "automatic" option.
   *
   * Read once and shown, so that choosing to follow the device is an informed
   * choice rather than a shrug.
   */
  readonly deviceTimezoneLabel = describeTimezone(deviceTimezone());

  /**
   * Whether the Fleet and Notifications tabs are shown.
   *
   * They describe roster imports and a Fleet's notices, none of which exist
   * until Fleet Community is switched on. Hidden rather than disabled, which is
   * how the rest of the site treats a feature that is off: a greyed-out control
   * advertises something that is not there yet.
   */
  isFleetOffered = false;

  /**
   * Whether the Chat tab and chat's notices are shown: presence, typing and
   * chat's notices (FC-034), which do nothing while chat is off.
   */
  isChatOffered = false;

  isLoading = true;
  errorMessage = '';
  registryState: RegistryState = 'loading';

  /** The control whose "Saved" note is showing, if any. */
  savedKey: SavedKey | null = null;

  /**
   * What the page last did, for screen readers.
   *
   * The visible note appears and disappears, which a live region does not
   * always announce; this one stays in the page and only its words change.
   */
  announcement = '';

  private readonly _destroy$ = new Subject<void>();
  private readonly _changes$ = new Subject<SettingChange>();
  private readonly _registryChanges$ = new Subject<boolean>();
  private readonly _privacyModeService = inject(PrivacyModeService);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _fleetConfigurationService = inject(
    FleetConfigurationService,
  );
  private readonly _authService = inject(AuthService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _cdr = inject(ChangeDetectorRef);

  private readonly _sections = viewChildren(CollapsibleSectionComponent);
  private readonly _sectionElements = viewChildren(
    CollapsibleSectionComponent,
    { read: ElementRef<HTMLElement> },
  );

  /** The settings as the server last confirmed them. */
  private _stored: UserSettings = DEFAULT_USER_SETTINGS;
  /** The profile as the server last confirmed it, for the registry switch. */
  private _profile: UserProfile | null = null;
  private _savedNoteTimer: ReturnType<typeof setTimeout> | undefined;
  private _markTimer: ReturnType<typeof setTimeout> | undefined;

  /** The tab the address asks for, shown once it is offered. */
  private _requestedTab: string | null = null;
  /** The setting the address leads to, until the page has gone to it. */
  private _pendingSetting: string | null = null;
  /** Whether the page knows which features are on, and so which tabs. */
  private _featuresKnown = false;

  constructor() {
    // Each time the page is drawn, until the setting a link led to is on it.
    afterEveryRender(() => this._goToSetting());
  }

  /** The tabs shown, in order. */
  get tabs(): SettingsTab[] {
    return SETTINGS_TABS.filter(tab => {
      if (tab === 'chat') {
        return this.isChatOffered;
      }

      return tab === 'fleet' || tab === 'notifications'
        ? this.isFleetOffered
        : true;
    });
  }

  /** The tab showing. */
  get activeTab(): SettingsTab {
    const requested = this.tabs.find(tab => tab === this._requestedTab);

    return requested ?? DEFAULT_SETTINGS_TAB;
  }

  ngOnInit(): void {
    this._route.queryParamMap
      .pipe(takeUntil(this._destroy$))
      .subscribe(params => {
        this._requestedTab = params.get('tab');
        this._cdr.markForCheck();
      });

    this._route.fragment.pipe(takeUntil(this._destroy$)).subscribe(id => {
      this._pendingSetting = id;
      this._cdr.markForCheck();
    });

    this._fleetConfigurationService
      .getFeatures()
      .pipe(takeUntil(this._destroy$))
      .subscribe(features => {
        this.isFleetOffered = features.isEnabled;
        this.isChatOffered = features.chatEnabled;
        this._featuresKnown = true;
        this._cdr.markForCheck();
      });

    this._changes$
      .pipe(
        concatMap(change => this._save(change)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    this._registryChanges$
      .pipe(
        concatMap(visible => this._saveRegistry(visible)),
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

    this.registryControl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(visible => this._registryChanges$.next(visible));

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

    this._dashboardService
      .getUser()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: user => {
          if (user.profile === undefined) {
            this.registryState = 'failed';
          } else {
            this._profile = user.profile;
            this.registryControl.setValue(user.profile.publiclyVisible, {
              emitEvent: false,
            });
            this.registryState = 'ready';
          }

          this._cdr.markForCheck();
        },
        error: () => {
          this.registryState = 'failed';
          this._cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this._savedNoteTimer);
    clearTimeout(this._markTimer);
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
   * Shows a tab, naming it in the address.
   *
   * @param tab - The tab.
   */
  select(tab: SettingsTab): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { tab },
      replaceUrl: true,
    });
  }

  /**
   * Moves between the tabs with the arrow keys, Home and End.
   *
   * @param event - The key that was pressed.
   */
  onTabKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs;
    const moved = nextTabIndex(
      event.key,
      tabs.indexOf(this.activeTab),
      tabs.length,
    );

    if (moved === null) {
      return;
    }

    event.preventDefault();
    this.select(tabs[moved]);
    const buttons =
      this._host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');

    buttons[moved].focus();
  }

  /**
   * Goes to the setting the address names, once it is on the page: opens the
   * tab's section holding it if it was folded, scrolls to it, focuses its
   * control and marks it for a moment. Runs after every render and does
   * nothing until then, or once it has been done.
   */
  private _goToSetting(): void {
    const id = this._pendingSetting;

    if (id === null || this.isLoading) {
      return;
    }

    const found = this._host.nativeElement.ownerDocument.getElementById(id);
    const target =
      found !== null && this._host.nativeElement.contains(found) ? found : null;

    // Not drawn yet, such as a Chat setting before the features are known or
    // the registry switch while the profile loads; the next render tries
    // again. Once everything is in, one that is not there, or not on the tab
    // showing, is left alone.
    if (target === null || target.closest('[hidden][role="tabpanel"]')) {
      if (this._featuresKnown && this.registryState !== 'loading') {
        this._pendingSetting = null;
      }

      return;
    }

    this._pendingSetting = null;
    this._sectionElements().forEach((section, index) => {
      if (section.nativeElement.contains(target)) {
        this._sections()[index].reveal();
      }
    });

    // Each anchor is the field or row around a control, never the control.
    const control = target.querySelector<HTMLElement>('select, button, input');

    target.scrollIntoView({ block: 'center' });
    control?.focus({ preventScroll: true });

    // Marked on the element itself, which is the page's own: binding a class
    // to each of a dozen anchors would say the same thing a dozen times.
    clearTimeout(this._markTimer);
    target.classList.add(SETTING_MARK_CLASS);
    this._markTimer = setTimeout(
      () => target.classList.remove(SETTING_MARK_CLASS),
      SETTING_MARK_DURATION_MS,
    );
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
        this._showSaved(change.key, SETTING_LABELS[change.key]);

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
        this._showFailed(SETTING_LABELS[change.key]);

        return EMPTY;
      }),
    );
  }

  /**
   * Saves the registry switch, with the personal details as last confirmed.
   *
   * @param visible - Whether to be listed.
   * @returns Completes once the change has been saved or put back.
   */
  private _saveRegistry(visible: boolean): Observable<unknown> {
    // Only drawn once the profile has been read.
    const previous = this._profile as UserProfile;

    return this._dashboardService
      .updatePersonalDetails({
        firstName: previous.firstName,
        lastName: previous.lastName,
        username: previous.username,
        publiclyVisible: visible,
      })
      .pipe(
        tap(result => {
          this._profile = {
            ...previous,
            ...result.userProfileData,
            publiclyVisible: result.userProfileData?.publiclyVisible ?? visible,
          };
          this.registryControl.setValue(this._profile.publiclyVisible, {
            emitEvent: false,
          });
          this.errorMessage = '';
          this._showSaved(REGISTRY_KEY, REGISTRY_LABEL);
          this._cdr.markForCheck();
        }),
        catchError(() => {
          this.registryControl.setValue(previous.publiclyVisible, {
            emitEvent: false,
          });
          this._showFailed(REGISTRY_LABEL);

          return EMPTY;
        }),
      );
  }

  /**
   * Shows the "Saved" note beside a control for a few seconds.
   *
   * @param key - What saved.
   * @param label - What it is called.
   */
  private _showSaved(key: SavedKey, label: string): void {
    clearTimeout(this._savedNoteTimer);
    this.savedKey = key;
    this.announcement = `${label} saved.`;
    this._savedNoteTimer = setTimeout(() => {
      this.savedKey = null;
      this._cdr.markForCheck();
    }, SAVED_NOTE_DURATION_MS);
  }

  /**
   * Says a change could not be saved and was put back.
   *
   * @param label - What it is called.
   */
  private _showFailed(label: string): void {
    this.errorMessage = `Unable to save ${label}. It has been put back.`;
    this.announcement = this.errorMessage;
    this._cdr.markForCheck();
  }
}
