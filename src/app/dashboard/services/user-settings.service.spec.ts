import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UserSettings } from '../models/user.model';
import { DashboardService } from './dashboard.service';
import {
  DEFAULT_USER_SETTINGS,
  UserSettingsService,
} from './user-settings.service';

describe('UserSettingsService', () => {
  const stored = (overrides: Partial<UserSettings> = {}): UserSettings => ({
    ...DEFAULT_USER_SETTINGS,
    ...overrides,
  });

  describe('with a DashboardService available', () => {
    let service: UserSettingsService;
    let dashboardService: {
      getUserSettings: jest.Mock;
      updateUserSettings: jest.Mock;
    };

    beforeEach(() => {
      dashboardService = {
        getUserSettings: jest.fn().mockReturnValue(of(stored())),
        updateUserSettings: jest.fn().mockReturnValue(of(stored())),
      };

      TestBed.configureTestingModule({
        providers: [
          UserSettingsService,
          { provide: DashboardService, useValue: dashboardService },
        ],
      });

      service = TestBed.inject(UserSettingsService);
    });

    it('reports nothing loaded until a load succeeds', () => {
      expect(service.settings()).toBeNull();
      expect(service.current()).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('loads and holds the settings', () => {
      dashboardService.getUserSettings.mockReturnValue(
        of(stored({ appearOffline: true })),
      );

      service.load().subscribe();

      expect(service.settings()?.appearOffline).toBe(true);
    });

    it('saves a change and holds what came back', () => {
      dashboardService.updateUserSettings.mockReturnValue(
        of(stored({ privacyMode: true })),
      );

      service.update({ privacyMode: true }).subscribe();

      expect(dashboardService.updateUserSettings).toHaveBeenCalledWith({
        privacyMode: true,
      });
      expect(service.settings()?.privacyMode).toBe(true);
    });

    describe('displayTimezone', () => {
      /**
       * The device's zone is both the default and the right answer before
       * anything has loaded: a date shown in the zone the reader is sitting in
       * is never surprising, and waiting for a round trip before rendering any
       * date would be.
       */
      it('follows the device before anything has loaded', () => {
        expect(service.displayTimezone()).toBe(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        expect(service.followsDevice()).toBe(true);
      });

      it('follows the device when no zone has been chosen', () => {
        service.load().subscribe();

        expect(service.displayTimezone()).toBe(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        expect(service.followsDevice()).toBe(true);
      });

      it('uses the chosen zone once one is stored', () => {
        dashboardService.getUserSettings.mockReturnValue(
          of(stored({ displayTimezone: 'Pacific/Auckland' })),
        );

        service.load().subscribe();

        expect(service.displayTimezone()).toBe('Pacific/Auckland');
        expect(service.followsDevice()).toBe(false);
      });

      /**
       * A stored zone this runtime cannot convert with — an older browser, a
       * hand-edited row — costs a preference rather than a page.
       */
      it('falls back to the device for a zone the runtime cannot use', () => {
        dashboardService.getUserSettings.mockReturnValue(
          of(stored({ displayTimezone: 'Europe/Nowhere' })),
        );

        service.load().subscribe();

        expect(service.displayTimezone()).toBe(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        expect(service.followsDevice()).toBe(true);
      });

      it('follows the device again when a zone is cleared', () => {
        dashboardService.updateUserSettings.mockReturnValue(
          of(stored({ displayTimezone: null })),
        );

        service
          .update({ privacyMode: false, displayTimezone: null })
          .subscribe();

        expect(service.followsDevice()).toBe(true);
      });
    });

    describe('loadQuietly', () => {
      it('holds the settings when the load succeeds', () => {
        dashboardService.getUserSettings.mockReturnValue(
          of(stored({ typingIndicatorsEnabled: true })),
        );

        service.loadQuietly();

        expect(service.settings()?.typingIndicatorsEnabled).toBe(true);
      });

      /**
       * Called at application start, where a signed-out visitor, an expired
       * token or an offline moment must not break anything. Every date falls
       * back to the reader's own device, which is what would have happened
       * anyway.
       */
      it('swallows a failure and leaves the device zone in place', () => {
        dashboardService.getUserSettings.mockReturnValue(
          throwError(() => new Error('no token')),
        );

        expect(() => service.loadQuietly()).not.toThrow();
        expect(service.settings()).toBeNull();
        expect(service.displayTimezone()).toBe(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
      });
    });
  });

  describe('without a DashboardService available', () => {
    let service: UserSettingsService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          UserSettingsService,
          { provide: DashboardService, useValue: null },
        ],
      });

      service = TestBed.inject(UserSettingsService);
    });

    it('loads the defaults', () => {
      let result: UserSettings | undefined;
      service.load().subscribe(settings => (result = settings));

      expect(result).toEqual(DEFAULT_USER_SETTINGS);
      expect(service.settings()).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('echoes a change onto the settings it holds', () => {
      let result: UserSettings | undefined;
      service
        .update({ privacyMode: true, presenceVisibility: 'EVERYONE' })
        .subscribe(settings => (result = settings));

      expect(result).toEqual(
        stored({ privacyMode: true, presenceVisibility: 'EVERYONE' }),
      );
      expect(service.settings()?.presenceVisibility).toBe('EVERYONE');
    });

    it('loads quietly', () => {
      service.loadQuietly();

      expect(service.settings()).toEqual(DEFAULT_USER_SETTINGS);
    });
  });
});
