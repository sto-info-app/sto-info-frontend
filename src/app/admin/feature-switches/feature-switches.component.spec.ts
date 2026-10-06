import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { FeatureSwitchState } from 'src/app/models/feature-switches.models';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';

import { FeatureSwitchesAdminService } from './feature-switches-admin.service';
import {
  changedByOf,
  FEATURE_SWITCH_ERROR,
  FeatureSwitchesComponent,
  switchCopy,
  switchOutcome,
} from './feature-switches.component';

const FLEET_OFF: FeatureSwitchState = {
  feature: 'FLEET_COMMUNITIES',
  label: 'Fleet Communities',
  isEnabled: false,
  changedAt: null,
  changedByUsername: null,
  subFlags: [
    {
      key: 'FLEET_REGISTRATION_ENABLED',
      label: 'Registering Communities, Fleets and Armadas',
      isEnabled: true,
    },
    {
      key: 'FLEET_CHAT_ENABLED',
      label: 'Chat and direct messages',
      isEnabled: false,
    },
  ],
};

const STORYTIME_ON: FeatureSwitchState = {
  feature: 'STORYTIME',
  label: 'Storytime',
  isEnabled: true,
  changedAt: '2026-10-06T09:00:00.000Z',
  changedByUsername: 'Quark',
  subFlags: [],
};

describe('changedByOf (FC-045)', () => {
  it('names who changed it, or says it was not recorded', () => {
    expect(changedByOf(STORYTIME_ON)).toBe('Quark');
    expect(changedByOf(FLEET_OFF)).toBe('Not recorded');
  });
});

describe('switchCopy (FC-045)', () => {
  it('asks to switch on what is off, saying the flags still apply', () => {
    expect(switchCopy(FLEET_OFF)).toEqual({
      title: 'Switch Fleet Communities on',
      message:
        'Within ten seconds Fleet Communities is open to everybody, as far ' +
        'as the capability flags beneath it allow.',
      confirmText: 'Switch on',
    });
  });

  it('asks to switch off what is on, saying nothing is deleted', () => {
    expect(switchCopy(STORYTIME_ON)).toEqual({
      title: 'Switch Storytime off',
      message:
        'Within ten seconds every page and route Storytime has disappears ' +
        'for everybody, as though it did not exist. Nothing it holds is ' +
        'deleted, and switching it on again brings it all back. Uploads are ' +
        'still scanned and published.',
      confirmText: 'Switch off',
    });
  });
});

describe('switchOutcome (FC-045)', () => {
  it('says what it came to, and that open pages need reloading', () => {
    expect(switchOutcome(STORYTIME_ON)).toBe(
      'Storytime switched on. Pages already open in a browser show it once ' +
        'they are reloaded.',
    );
    expect(switchOutcome(FLEET_OFF)).toBe(
      'Fleet Communities switched off. Pages already open in a browser show ' +
        'it once they are reloaded.',
    );
  });
});

describe('FeatureSwitchesComponent (FC-045)', () => {
  let fixture: ComponentFixture<FeatureSwitchesComponent>;
  let switches: { list: jest.Mock; set: jest.Mock };
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    switches = {
      list: jest.fn(() => of([FLEET_OFF, STORYTIME_ON])),
      set: jest.fn(() => of({ ...FLEET_OFF, isEnabled: true })),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of('Accepted for release') })),
    };
    TestBed.configureTestingModule({
      imports: [FeatureSwitchesComponent],
      providers: [
        provideRouter([]),
        { provide: FeatureSwitchesAdminService, useValue: switches },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  /** Shows the panel. */
  const show = async () => {
    fixture = TestBed.createComponent(FeatureSwitchesComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (name: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  const feature = (key: string) =>
    element().querySelector<HTMLElement>(
      `li[aria-labelledby="feature-switch-${key}"]`,
    )!;
  const words = (node: HTMLElement) =>
    node.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('explains the switches and links to their help', async () => {
    await show();

    expect(text()).toContain(
      'A feature switched off disappears for everybody, as though it did ' +
        'not exist; nothing it holds is deleted.',
    );
    expect(
      element().querySelector('a[href="/help/site-admin-features"]'),
    ).not.toBeNull();
  });

  it('lists each feature with whether it is on, and who last changed it', async () => {
    await show();

    const fleet = feature('FLEET_COMMUNITIES');
    const storytime = feature('STORYTIME');

    expect(fleet.querySelector('h3')?.textContent?.trim()).toBe(
      'Fleet Communities',
    );
    expect(words(fleet.querySelector('.feature-switches__state')!)).toBe('Off');
    expect([...fleet.querySelectorAll('dd')].map(each => words(each))).toEqual([
      'Never',
      'Not recorded',
    ]);
    expect(words(storytime.querySelector('.feature-switches__state')!)).toBe(
      'On',
    );
    expect(
      [...storytime.querySelectorAll('dd')].map(each => words(each)),
    ).toEqual(['Oct 6, 2026, 9:00:00 AM', 'Quark']);
    expect(storytime.classList).toContain('feature-switches__feature--on');
    expect(fleet.classList).not.toContain('feature-switches__feature--on');
  });

  it('shows the environment’s flags, read-only, and none for a feature without', async () => {
    await show();

    const fleet = feature('FLEET_COMMUNITIES');
    const flags = [...fleet.querySelectorAll('.feature-switches__flags li')];

    expect(words(fleet)).toContain('Set by the environment');
    expect(flags.map(each => words(each as HTMLElement))).toEqual([
      'Registering Communities, Fleets and Armadas: allowed',
      'Chat and direct messages: not allowed',
    ]);
    expect(
      flags[1].querySelector('.feature-switches__flag--off'),
    ).not.toBeNull();
    expect(fleet.querySelectorAll('input, select')).toHaveLength(0);
    expect(words(feature('STORYTIME'))).not.toContain('Set by the environment');
  });

  it('switches a feature on with a reason, and shows it as the server has it', async () => {
    await show();

    const control = button('Switch Fleet Communities on')!;

    expect(control.textContent?.trim()).toBe('Switch on');
    expect(control.classList).toContain('green');
    control.click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Switch Fleet Communities on',
          label: 'Reason',
          confirmText: 'Switch on',
          max: ADMIN_REASON_MAX_LENGTH,
        }),
      }),
    );
    expect(switches.set).toHaveBeenCalledWith(
      'FLEET_COMMUNITIES',
      true,
      'Accepted for release',
    );
    expect(element().querySelector('[role="status"]')?.textContent).toContain(
      'Fleet Communities switched on.',
    );
    expect(button('Switch Fleet Communities off')).not.toBeNull();
    // The other switch is left as it was.
    expect(button('Switch Storytime off')).not.toBeNull();
  });

  it('switches a feature off with a reason', async () => {
    switches.set.mockReturnValue(of({ ...STORYTIME_ON, isEnabled: false }));
    await show();

    const control = button('Switch Storytime off')!;

    expect(control.textContent?.trim()).toBe('Switch off');
    expect(control.classList).toContain('red');
    control.click();
    await fixture.whenStable();

    expect(switches.set).toHaveBeenCalledWith(
      'STORYTIME',
      false,
      'Accepted for release',
    );
    expect(text()).toContain('Storytime switched off.');
  });

  it('changes nothing when the dialog is closed without a reason', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    await show();

    button('Switch Fleet Communities on')!.click();
    await fixture.whenStable();

    expect(switches.set).not.toHaveBeenCalled();
    expect(element().querySelector('[role="status"]')).toBeNull();
  });

  it('shows the server’s reason when it refuses, and reads the switches again', async () => {
    switches.set.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Fleet Communities is already switched on.' },
          }),
      ),
    );
    await show();

    button('Switch Fleet Communities on')!.click();
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'Fleet Communities is already switched on.',
    );
    expect(switches.list).toHaveBeenCalledTimes(2);
  });

  it('says it could not be done when the server gives no reason', async () => {
    switches.set.mockReturnValue(throwError(() => new Error('offline')));
    await show();

    button('Switch Fleet Communities on')!.click();
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      FEATURE_SWITCH_ERROR,
    );
  });

  it('says so while reading, and offers to try again when it cannot', async () => {
    switches.list.mockReturnValue(throwError(() => new Error('offline')));
    await show();

    expect(text()).toContain('The feature switches could not be read.');

    switches.list.mockReturnValue(of([FLEET_OFF]));
    [...element().querySelectorAll('button')]
      .find(each => each.textContent?.trim() === 'Try again')!
      .click();
    await fixture.whenStable();

    expect(button('Switch Fleet Communities on')).not.toBeNull();
    expect(text()).not.toContain('could not be read');
  });

  it('says it is reading before the answer arrives', () => {
    switches.list.mockReturnValue(of());
    fixture = TestBed.createComponent(FeatureSwitchesComponent);
    fixture.detectChanges();

    expect(text()).toContain('Reading the feature switches…');
  });
});
