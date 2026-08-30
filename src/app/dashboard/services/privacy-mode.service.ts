import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { UserSettings } from '../models/user.model';
import { DashboardService } from './dashboard.service';

@Injectable({ providedIn: 'root' })
export class PrivacyModeService {
  private readonly _dashboardService = inject(DashboardService, {
    optional: true,
  });
  private readonly _privacyMode = signal(true);

  readonly isEnabled = computed(() => this._privacyMode());

  load(): Observable<UserSettings> {
    if (!this._dashboardService) {
      return of({ privacyMode: false }).pipe(
        tap(settings => this._privacyMode.set(settings.privacyMode)),
      );
    }

    return this._dashboardService
      .getUserSettings()
      .pipe(tap(settings => this._privacyMode.set(settings.privacyMode)));
  }

  update(privacyMode: boolean): Observable<UserSettings> {
    if (!this._dashboardService) {
      return of({ privacyMode }).pipe(
        tap(settings => this._privacyMode.set(settings.privacyMode)),
      );
    }

    return this._dashboardService
      .updateUserSettings({ privacyMode })
      .pipe(tap(settings => this._privacyMode.set(settings.privacyMode)));
  }
}
