import { computed, inject, Injectable, signal } from '@angular/core';

import { catchError, EMPTY, Observable, of, tap } from 'rxjs';

import { DEFAULT_SESSION_TIMEOUT_MINUTES } from 'src/app/shared/constants/session-timeout.constants';
import {
  deviceTimezone,
  isUsableTimezone,
} from 'src/app/shared/utils/timezone.utils';

import { UserSettings, UserSettingsUpdate } from '../models/user.model';
import { DashboardService } from './dashboard.service';

/**
 * What an account has before anything has been loaded or chosen.
 *
 * Declared once so that the settings form, the signed-out case and a failed
 * load all describe the same account rather than three slightly different ones.
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  privacyMode: false,
  sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
  displayTimezone: null,
  stoExportTimezone: null,
  presenceVisibility: 'FRIENDS',
  appearOffline: false,
  typingIndicatorsEnabled: false,
  notifyMention: true,
  notifyReply: true,
  notifyDirectMessage: true,
  notifyRosterAssociation: true,
  notifyEventReminder: true,
};

/**
 * The account settings, loaded once and shared.
 *
 * One transport for the whole settings page, and the only place the display
 * timezone is resolved. Every date in the application is rendered through
 * {@link displayTimezone}, so a second copy of this state would mean two
 * answers to what time it is.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly _dashboardService = inject(DashboardService, {
    optional: true,
  });

  private readonly _settings = signal<UserSettings | null>(null);

  /** The loaded settings, or null until a load has succeeded. */
  readonly settings = computed(() => this._settings());

  /**
   * The timezone dates should be rendered in.
   *
   * Falls back to the device's own zone, which is both the default and the
   * right answer when nothing has loaded yet: a date shown in the zone the
   * reader is sitting in is never surprising, and waiting for a round trip
   * before rendering any date would be.
   *
   * A stored zone the runtime cannot convert with is ignored rather than
   * thrown, so a value from an older browser or a hand-edited row costs a
   * preference rather than a page.
   */
  readonly displayTimezone = computed(() => {
    const stored = this._settings()?.displayTimezone ?? null;

    return isUsableTimezone(stored) ? stored : deviceTimezone();
  });

  /** Whether the user has pinned a zone rather than following their device. */
  readonly followsDevice = computed(
    () => !isUsableTimezone(this._settings()?.displayTimezone ?? null),
  );

  /**
   * Loads the settings from the server.
   *
   * @returns The loaded settings.
   */
  load(): Observable<UserSettings> {
    if (!this._dashboardService) {
      return of(DEFAULT_USER_SETTINGS).pipe(
        tap(settings => this._settings.set(settings)),
      );
    }

    return this._dashboardService
      .getUserSettings()
      .pipe(tap(settings => this._settings.set(settings)));
  }

  /**
   * Loads the settings, discarding any failure.
   *
   * For the application start, where the settings are wanted but nothing should
   * break without them: a signed-out visitor, an expired token or an offline
   * moment leaves every date rendered in the device's own zone, which is what
   * would have happened anyway.
   */
  loadQuietly(): void {
    this.load()
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  /**
   * Saves a change to the settings.
   *
   * @param changes - The fields to change; omitted fields are left alone.
   * @returns The settings as they now stand.
   */
  update(changes: UserSettingsUpdate): Observable<UserSettings> {
    if (!this._dashboardService) {
      const updated = { ...this.current(), ...changes };

      return of(updated).pipe(tap(settings => this._settings.set(settings)));
    }

    return this._dashboardService
      .updateUserSettings(changes)
      .pipe(tap(settings => this._settings.set(settings)));
  }

  /**
   * The settings as they currently stand, falling back to the defaults.
   *
   * @returns The loaded settings, or the defaults when none have loaded.
   */
  current(): UserSettings {
    return this._settings() ?? DEFAULT_USER_SETTINGS;
  }
}
