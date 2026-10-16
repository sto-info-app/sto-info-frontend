import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FLEET_FEATURES_DISABLED } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { UserSettings } from '../models/user.model';
import { PrivacyModeService } from '../services/privacy-mode.service';
import { DEFAULT_USER_SETTINGS } from '../services/user-settings.service';
import { findHelpGuide } from 'src/app/static-pages/help/help.data';
import { SETTINGS_FORM_LABELS } from 'src/app/static-pages/help/help.testing';
import {
  SAVED_NOTE_DURATION_MS,
  SettingsComponent,
} from './settings.component';

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

  /**
   * The word beside a control once it has saved.
   *
   * @param key - The control's form name, or a chooser's id.
   * @returns The note's text, or null while there is none.
   */
  const savedNoteBeside = (key: string): string | null => {
    const control = fixture.nativeElement.querySelector(
      `[formcontrolname="${key}"], #${key}`,
    ) as HTMLElement | null;
    const row = control?.closest('.settings-row, .settings-chooser');

    return row?.querySelector('.settings-saved')?.textContent?.trim() ?? null;
  };

  it('fills the form in without saving it', () => {
    privacyModeService.load.mockReturnValue(
      of(settings({ privacyMode: true, sessionTimeoutMinutes: 60 })),
    );

    createComponent();

    expect(component.settingsForm.getRawValue()).toEqual(
      settings({ privacyMode: true, sessionTimeoutMinutes: 60 }),
    );
    expect(privacyModeService.update).not.toHaveBeenCalled();
  });

  it('has no Save button', () => {
    createComponent();

    expect(
      fixture.nativeElement.querySelector('button[type="submit"]'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/\bSave\b/);
  });

  /**
   * The server insists on the privacy mode with every change, so it travels
   * alongside the one field that changed and nothing else.
   */
  it('saves a changed setting on its own, with the stored privacy mode', () => {
    privacyModeService.update.mockReturnValue(
      of(settings({ sessionTimeoutMinutes: 480 })),
    );
    createComponent();

    component.settingsForm.controls.sessionTimeoutMinutes.setValue(480);

    expect(privacyModeService.update).toHaveBeenCalledTimes(1);
    expect(privacyModeService.update).toHaveBeenCalledWith({
      privacyMode: false,
      sessionTimeoutMinutes: 480,
    });
    expect(component.errorMessage).toBe('');
  });

  it('shows Saved beside the control that saved, then takes it away', () => {
    jest.useFakeTimers();
    try {
      createComponent();

      component.settingsForm.controls.privacyMode.setValue(true);
      fixture.detectChanges();

      expect(savedNoteBeside('privacyMode')).toBe('Saved');
      expect(savedNoteBeside('session-timeout')).toBeNull();
      expect(component.announcement).toBe('Privacy Mode saved.');

      jest.advanceTimersByTime(SAVED_NOTE_DURATION_MS);
      fixture.detectChanges();

      expect(savedNoteBeside('privacyMode')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * A value the server sent back is written into the form silently; were it
   * heard as a change, every save would beget another.
   */
  it('does not save again what the server sent back', () => {
    privacyModeService.update.mockReturnValue(
      of(settings({ privacyMode: true, sessionTimeoutMinutes: 60 })),
    );
    createComponent();

    component.settingsForm.controls.privacyMode.setValue(true);

    expect(privacyModeService.update).toHaveBeenCalledTimes(1);
    expect(component.settingsForm.controls.privacyMode.value).toBe(true);
    // Only the field that was saved is taken from the answer.
    expect(component.settingsForm.controls.sessionTimeoutMinutes.value).toBe(
      240,
    );
  });

  it('puts a failed change back and names the setting', () => {
    privacyModeService.update.mockReturnValue(
      throwError(() => new Error('nope')),
    );
    createComponent();

    component.settingsForm.controls.privacyMode.setValue(true);
    fixture.detectChanges();

    expect(component.settingsForm.controls.privacyMode.value).toBe(false);
    expect(component.errorMessage).toBe(
      'Unable to save Privacy Mode. It has been put back.',
    );
    expect(component.announcement).toBe(component.errorMessage);
    expect(fixture.nativeElement.textContent).toContain(
      'Unable to save Privacy Mode. It has been put back.',
    );
    expect(savedNoteBeside('privacyMode')).toBeNull();
    // Putting it back is not a change to be saved.
    expect(privacyModeService.update).toHaveBeenCalledTimes(1);
  });

  it('clears the error once a later change saves', () => {
    privacyModeService.update
      .mockReturnValueOnce(throwError(() => new Error('nope')))
      .mockReturnValueOnce(of(settings({ sessionTimeoutMinutes: 60 })));
    createComponent();

    component.settingsForm.controls.privacyMode.setValue(true);
    component.settingsForm.controls.sessionTimeoutMinutes.setValue(60);

    expect(component.errorMessage).toBe('');
    expect(component.settingsForm.controls.sessionTimeoutMinutes.value).toBe(
      60,
    );
  });

  /**
   * Two changes in quick succession reach the server in the order they were
   * made, the second waiting for the first's answer, so neither can overtake
   * the other and leave the stored settings as nobody chose them.
   */
  it('saves changes one at a time, in order', () => {
    const first = new Subject<UserSettings>();
    privacyModeService.update
      .mockReturnValueOnce(first.asObservable())
      .mockReturnValueOnce(
        of(settings({ privacyMode: true, sessionTimeoutMinutes: 60 })),
      );
    createComponent();

    component.settingsForm.controls.privacyMode.setValue(true);
    component.settingsForm.controls.sessionTimeoutMinutes.setValue(60);

    expect(privacyModeService.update).toHaveBeenCalledTimes(1);

    first.next(settings({ privacyMode: true }));
    first.complete();

    expect(privacyModeService.update).toHaveBeenCalledTimes(2);
    expect(privacyModeService.update).toHaveBeenLastCalledWith({
      privacyMode: true,
      sessionTimeoutMinutes: 60,
    });
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

    expect(privacyModeService.update).toHaveBeenCalledWith({
      privacyMode: false,
      sessionTimeoutMinutes: 480,
    });
    expect(authService.refreshToken).toHaveBeenCalled();
  });

  it('leaves the session alone when something other than the timeout changes', () => {
    createComponent();

    component.settingsForm.controls.privacyMode.setValue(true);

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

    expect(component.errorMessage).toBe('');
    expect(component.settingsForm.controls.sessionTimeoutMinutes.value).toBe(
      60,
    );
    expect(component.savedKey).toBe('sessionTimeoutMinutes');
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
    const withFleetEnabled = (chatEnabled = true): void => {
      fleetConfigurationService.getFeatures.mockReturnValue(
        of({ ...FLEET_FEATURES_DISABLED, isEnabled: true, chatEnabled }),
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

    it('appear once it is switched on, without chat’s while chat is off', () => {
      withFleetEnabled(false);
      createComponent();

      expect(component.isFleetOffered).toBe(true);
      expect(component.isChatOffered).toBe(false);
      expect(
        fixture.nativeElement.querySelector('#export-timezone'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('#presence-visibility'),
      ).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Mentions');
    });

    it('offer presence, typing and chat’s notices while chat is on (FC-034)', () => {
      fleetConfigurationService.getFeatures.mockReturnValue(
        of({ ...FLEET_FEATURES_DISABLED, isEnabled: true, chatEnabled: true }),
      );
      createComponent();

      expect(component.isChatOffered).toBe(true);
      expect(
        fixture.nativeElement.querySelector('#presence-visibility'),
      ).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain(
        'Show when I am typing',
      );
      expect(fixture.nativeElement.textContent).toContain('Mentions');
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

      expect(select.options[0].textContent).toContain('My device’s zone');
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
     * Only the changed field is sent, so a change made from a deployment with
     * Fleet switched off leaves somebody's hidden presence choice exactly as
     * it was rather than resetting it to the default.
     */
    it('are left alone while hidden', () => {
      privacyModeService.load.mockReturnValue(
        of(settings({ presenceVisibility: 'EVERYONE', appearOffline: true })),
      );
      createComponent();

      component.settingsForm.controls.privacyMode.setValue(true);

      expect(privacyModeService.update).toHaveBeenCalledWith({
        privacyMode: true,
      });
      expect(component.settingsForm.controls.presenceVisibility.value).toBe(
        'EVERYONE',
      );
    });
  });

  describe('its Help (FC-049)', () => {
    /** Shows the page with Fleet Community and chat on. */
    const createWithEverything = (): void => {
      fleetConfigurationService.getFeatures.mockReturnValue(
        of({ ...FLEET_FEATURES_DISABLED, isEnabled: true, chatEnabled: true }),
      );
      createComponent();
    };

    /**
     * Each help link on the page: where it leads and what it says.
     *
     * @returns The links, in page order.
     */
    const helpLinks = (): [string | null, string][] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('a.help-link'),
      ).map(link => [
        link.getAttribute('href'),
        link.querySelector('.help-link__label')!.textContent,
      ]);

    // A link under each heading, to that panel's guide.
    it('links the page and each of its panels to its own guide', () => {
      createWithEverything();

      expect(helpLinks()).toEqual([
        ['/help/your-settings', 'Help with Settings'],
        ['/help/privacy-mode', 'Help with Privacy Mode'],
        ['/help/staying-signed-in', 'Help with staying signed in'],
        ['/help/dates-and-times', 'Help with dates and times'],
        ['/help/fleet-settings', 'Help with Fleet settings'],
        ['/help/what-you-are-notified-about', 'Help with notifications'],
        ['/help/what-custom-tracking-is', 'Help with Custom Tracking'],
      ]);
    });

    it('leads only to guides that exist', () => {
      createWithEverything();

      helpLinks().forEach(([href]) => {
        expect(findHelpGuide(href!.replace('/help/', ''))).toBeDefined();
      });
    });

    // The Fleet panels, and their links, go with Fleet Community.
    it('offers no link to a Fleet guide while Fleet Community is off', () => {
      createComponent();

      expect(helpLinks().map(([href]) => href)).toEqual([
        '/help/your-settings',
        '/help/privacy-mode',
        '/help/staying-signed-in',
        '/help/dates-and-times',
        '/help/what-custom-tracking-is',
      ]);
    });

    // The Help data's spec checks the guides use each of these labels; this
    // checks the page still shows them, so a control renamed without its
    // guide fails one or the other. One change is made first, since the
    // "Saved" note is among them and only appears once something has saved.
    it.each(SETTINGS_FORM_LABELS)(
      'shows the label “%s” its guide quotes',
      label => {
        createWithEverything();
        component.settingsForm.controls.privacyMode.setValue(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain(label);
      },
    );
  });
});
