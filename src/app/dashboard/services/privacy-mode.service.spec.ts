import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UserSettings } from '../models/user.model';
import { PrivacyModeService } from './privacy-mode.service';
import {
  DEFAULT_USER_SETTINGS,
  UserSettingsService,
} from './user-settings.service';

describe('PrivacyModeService', () => {
  let service: PrivacyModeService;
  let settingsService: {
    settings: jest.Mock<UserSettings | null, []>;
    load: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    settingsService = {
      settings: jest.fn<UserSettings | null, []>().mockReturnValue(null),
      load: jest.fn().mockReturnValue(of(DEFAULT_USER_SETTINGS)),
      update: jest.fn().mockReturnValue(of(DEFAULT_USER_SETTINGS)),
    };

    TestBed.configureTestingModule({
      providers: [
        PrivacyModeService,
        { provide: UserSettingsService, useValue: settingsService },
      ],
    });

    service = TestBed.inject(PrivacyModeService);
  });

  /**
   * Fails closed. Showing an email address to somebody who has asked for it to
   * be hidden is worse than hiding one for the moment it takes to find out, so
   * "we do not know yet" and "hide it" are deliberately the same answer.
   */
  it('reports privacy mode on until settings have loaded', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('reports what the loaded settings say', () => {
    settingsService.settings.mockReturnValue({
      ...DEFAULT_USER_SETTINGS,
      privacyMode: false,
    });

    expect(service.isEnabled()).toBe(false);
  });

  it('delegates loading', () => {
    let result: UserSettings | undefined;
    service.load().subscribe(settings => (result = settings));

    expect(settingsService.load).toHaveBeenCalled();
    expect(result).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('delegates saving, passing the changes through untouched', () => {
    service.update({ privacyMode: true, appearOffline: true }).subscribe();

    expect(settingsService.update).toHaveBeenCalledWith({
      privacyMode: true,
      appearOffline: true,
    });
  });
});
