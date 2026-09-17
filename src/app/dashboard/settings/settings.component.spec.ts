import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FLEET_FEATURES_DISABLED } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { UserSettings } from '../models/user.model';
import { PrivacyModeService } from '../services/privacy-mode.service';
import { DEFAULT_USER_SETTINGS } from '../services/user-settings.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let privacyModeService: jest.Mocked<PrivacyModeService>;
  let authService: {
    getSessionTimeoutMinutes: jest.Mock;
    refreshToken: jest.Mock;
  };
  let fleetConfigurationService: { getFeatures: jest.Mock };

  const settings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
    ...DEFAULT_USER_SETTINGS,
    ...overrides,
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    privacyModeService = {
      load: jest.fn().mockReturnValue(of(settings())),
      update: jest.fn().mockReturnValue(of(settings({ privacyMode: true }))),
    } as unknown as jest.Mocked<PrivacyModeService>;

    // Off unless a test switches it on, matching a deployment before release.
    fleetConfigurationService = {
      getFeatures: jest.fn().mockReturnValue(of(FLEET_FEATURES_DISABLED)),
    };

    authService = {
      getSessionTimeoutMinutes: jest.fn().mockReturnValue(240),
      refreshToken: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: PrivacyModeService, useValue: privacyModeService },
        { provide: AuthService, useValue: authService },
        {
          provide: FleetConfigurationService,
          useValue: fleetConfigurationService,
        },
      ],
    }).compileComponents();
  });

  it('should create and load the current settings', () => {
    createComponent();

    expect(component).toBeTruthy();
    expect(privacyModeService.load).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.settingsForm.getRawValue()).toEqual(settings());
  });

  it('shows help for privacy mode', () => {
    createComponent();

    const trigger = fixture.nativeElement.querySelector(
      '.settings-help-trigger',
    ) as HTMLElement | null;

    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('aria-label')).toBe('Privacy mode details');
    expect(fixture.nativeElement.textContent).toContain(
      'Private details like email addresses and usernames are hidden while this is on.',
    );
  });

  it('shows an error when settings fail to load', () => {
    privacyModeService.load.mockReturnValue(
      throwError(() => new Error('nope')),
    );

    createComponent();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Unable to load settings.');
    expect(fixture.nativeElement.textContent).toContain(
      'Unable to load settings.',
    );
  });

  it('saves the settings and marks the form pristine', () => {
    createComponent();
    component.settingsForm.controls.privacyMode.setValue(true);
    component.settingsForm.markAsDirty();

    component.save();

    expect(privacyModeService.update).toHaveBeenCalledWith(
      settings({ privacyMode: true }),
    );
    expect(component.isSaving).toBe(false);
    expect(component.settingsForm.getRawValue()).toEqual(
      settings({ privacyMode: true }),
    );
    expect(component.settingsForm.pristine).toBe(true);
  });

  it('shows an error when saving fails', () => {
    privacyModeService.update.mockReturnValue(
      throwError(() => new Error('nope')),
    );
    createComponent();

    component.save();

    expect(component.isSaving).toBe(false);
    expect(component.errorMessage).toBe('Unable to save settings.');
  });

  it('ignores a save while another save is in flight', () => {
    createComponent();
    component.isSaving = true;

    component.save();

    expect(privacyModeService.update).not.toHaveBeenCalled();
  });

  it('submits the form when the save button is clicked', () => {
    createComponent();
    component.settingsForm.markAsDirty();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    button.click();

    expect(privacyModeService.update).toHaveBeenCalledWith(settings());
  });

  it('offers every inactivity window, and describes what it does', () => {
    createComponent();

    const select = fixture.nativeElement.querySelector(
      '#session-timeout',
    ) as HTMLSelectElement;
    const labels = Array.from(select.options).map(option => option.textContent);

    expect(labels).toEqual(['1 hour', '4 hours', '8 hours']);
    expect(select.getAttribute('aria-describedby')).toBe(
      'session-timeout-description',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'How long you can be away before you are signed out.',
    );
  });

  it('renews the session so a changed timeout applies straight away', () => {
    privacyModeService.update.mockReturnValue(
      of(settings({ sessionTimeoutMinutes: 480 })),
    );
    createComponent();
    component.settingsForm.controls.sessionTimeoutMinutes.setValue(480);
    component.settingsForm.markAsDirty();

    component.save();

    expect(privacyModeService.update).toHaveBeenCalledWith(
      settings({ sessionTimeoutMinutes: 480 }),
    );
    expect(authService.refreshToken).toHaveBeenCalled();
  });

  it('leaves the session alone when the timeout is unchanged', () => {
    createComponent();
    component.settingsForm.controls.privacyMode.setValue(true);
    component.settingsForm.markAsDirty();

    component.save();

    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('still saves when renewing the session fails', () => {
    authService.refreshToken.mockReturnValue(
      throwError(() => new Error('nope')),
    );
    privacyModeService.update.mockReturnValue(
      of(settings({ sessionTimeoutMinutes: 60 })),
    );
    createComponent();
    component.settingsForm.controls.sessionTimeoutMinutes.setValue(60);
    component.settingsForm.markAsDirty();

    component.save();

    expect(component.errorMessage).toBe('');
    expect(component.settingsForm.pristine).toBe(true);
  });
  describe('dates and times', () => {
    /**
     * Account-wide, so it is offered whether or not Fleet Community is switched
     * on: it governs every date the application renders, not only Fleet ones.
     */
    it('offers the display timezone even with Fleet switched off', () => {
      createComponent();

      const select = fixture.nativeElement.querySelector(
        '#display-timezone',
      ) as HTMLSelectElement;

      expect(select).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain(
        'Every date and time in STO Info is shown in this zone.',
      );
    });

    /**
     * The first option names the device's own zone rather than saying
     * "automatic" and leaving the reader to guess which one that is.
     */
    it('names the device zone in the automatic option', () => {
      createComponent();

      const select = fixture.nativeElement.querySelector(
        '#display-timezone',
      ) as HTMLSelectElement;

      expect(select.options[0].textContent).toContain('Automatically');
      expect(select.options[0].textContent).toContain(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    });

    it('offers the zones this runtime can convert with', () => {
      createComponent();

      const select = fixture.nativeElement.querySelector(
        '#display-timezone',
      ) as HTMLSelectElement;

      expect(select.options.length).toBeGreaterThan(1);
      expect(component.timezones[0]).toBe('UTC');
    });

    it('describes a zone with its current offset', () => {
      createComponent();

      expect(component.describe('Europe/London')).toMatch(
        /^Europe\/London \(GMT[+-]\d/,
      );
    });
  });

  describe('the Fleet preferences', () => {
    const withFleetEnabled = (): void => {
      fleetConfigurationService.getFeatures.mockReturnValue(
        of({ ...FLEET_FEATURES_DISABLED, isEnabled: true }),
      );
    };

    /**
     * Hidden rather than disabled while the feature is off. Presence, typing
     * and roster imports do not exist yet, and a greyed-out control advertises
     * something that is not there.
     */
    it('are absent while Fleet Community is switched off', () => {
      createComponent();

      expect(component.isFleetOffered).toBe(false);
      expect(
        fixture.nativeElement.querySelector('#export-timezone'),
      ).toBeNull();
      expect(
        fixture.nativeElement.querySelector('#presence-visibility'),
      ).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Show when I am typing',
      );
    });

    it('appear once it is switched on', () => {
      withFleetEnabled();
      createComponent();

      expect(component.isFleetOffered).toBe(true);
      expect(
        fixture.nativeElement.querySelector('#export-timezone'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('#presence-visibility'),
      ).toBeTruthy();
    });

    /**
     * The export zone is a fact about the machine a file came from, not about
     * the person uploading it, so the page says so and offers to ask each time
     * rather than defaulting to the display zone.
     */
    it('explain that the export zone is separate from the display zone', () => {
      withFleetEnabled();
      createComponent();

      const select = fixture.nativeElement.querySelector(
        '#export-timezone',
      ) as HTMLSelectElement;

      expect(select.options[0].textContent).toContain('Ask me each time');
      expect(fixture.nativeElement.textContent).toContain(
        'It is separate from the setting above',
      );
    });

    it('offer the three presence audiences, and no hidden one', () => {
      withFleetEnabled();
      createComponent();

      const select = fixture.nativeElement.querySelector(
        '#presence-visibility',
      ) as HTMLSelectElement;
      const labels = Array.from(select.options).map(option =>
        option.textContent?.trim(),
      );

      expect(labels).toEqual([
        'Everyone',
        'Friends only',
        'My Fleets and Armadas',
      ]);
    });

    /**
     * Appearing offline is a separate switch so that hiding for an afternoon
     * does not overwrite the audience the user chose, and the page says so.
     */
    it('explain that appearing offline keeps the chosen audience', () => {
      withFleetEnabled();
      createComponent();

      expect(fixture.nativeElement.textContent).toContain(
        'Your choice is remembered for when you switch this back off.',
      );
    });

    it('offer every notification category, including roster proposals', () => {
      withFleetEnabled();
      createComponent();

      for (const label of [
        'Mentions',
        'Replies',
        'Direct messages',
        'Roster association proposals',
        'Event reminders',
      ]) {
        expect(fixture.nativeElement.textContent).toContain(label);
      }
    });

    /**
     * Switching off roster association proposals is allowed, so the page has to
     * say what that costs rather than letting somebody discover it.
     */
    it('warn that a silenced roster proposal expires unanswered', () => {
      withFleetEnabled();
      createComponent();

      expect(fixture.nativeElement.textContent).toContain(
        'an unanswered proposal eventually expires',
      );
    });

    /**
     * The hidden controls still hold their loaded values, so saving from a
     * deployment with Fleet switched off returns them unchanged rather than
     * resetting somebody's presence choice to the default.
     */
    it('are still saved unchanged while hidden', () => {
      privacyModeService.load.mockReturnValue(
        of(settings({ presenceVisibility: 'EVERYONE', appearOffline: true })),
      );
      createComponent();
      component.settingsForm.controls.privacyMode.setValue(true);

      component.save();

      expect(privacyModeService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          presenceVisibility: 'EVERYONE',
          appearOffline: true,
        }),
      );
    });
  });
});
