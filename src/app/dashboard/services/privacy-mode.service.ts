import { computed, inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { UserSettings, UserSettingsUpdate } from '../models/user.model';
import { UserSettingsService } from './user-settings.service';

/**
 * Whether private details are visually obscured.
 *
 * A thin reading of {@link UserSettingsService}, kept as its own service
 * because a dozen components ask this one question and none of them should have
 * to know where the answer is stored.
 *
 * It starts enabled, and stays enabled until settings have actually loaded.
 * That is deliberate and fails closed: showing private details to somebody who
 * has asked for them to be hidden is worse than hiding them for the moment it
 * takes to find out.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyModeService {
  private readonly _settingsService = inject(UserSettingsService);

  readonly isEnabled = computed(
    () => this._settingsService.settings()?.privacyMode ?? true,
  );

  /**
   * Loads the settings.
   *
   * @returns The loaded settings.
   */
  load(): Observable<UserSettings> {
    return this._settingsService.load();
  }

  /**
   * Saves a change to the settings.
   *
   * @param changes - The fields to change; omitted fields are left alone.
   * @returns The settings as they now stand.
   */
  update(changes: UserSettingsUpdate): Observable<UserSettings> {
    return this._settingsService.update(changes);
  }
}
