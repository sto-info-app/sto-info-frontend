import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import { PublicationPause } from 'src/app/models/scan-diagnostics.models';

import { PublicationPauseAdminService } from './publication-pause-admin.service';
import {
  ACCOUNT_SINCE_CLOSED,
  pausedByOf,
  pauseOutcome,
  PUBLICATION_PAUSE_ERROR,
  PublicationPauseComponent,
} from './publication-pause.component';

const RUNNING: PublicationPause = {
  paused: false,
  pausedAt: null,
  pausedByUserId: null,
  pausedByUsername: null,
  queuePaused: false,
  held: 0,
};

const PAUSED: PublicationPause = {
  paused: true,
  pausedAt: '2026-09-30T10:00:00.000Z',
  pausedByUserId: 'admin-1',
  pausedByUsername: 'Quark',
  queuePaused: true,
  held: 3,
};

describe('pausedByOf (FC-042)', () => {
  it('says You, the username, a closed account, or that it does not know', () => {
    expect(pausedByOf(PAUSED, 'admin-1')).toBe('You');
    expect(pausedByOf(PAUSED, 'admin-2')).toBe('Quark');
    expect(pausedByOf(PAUSED, null)).toBe('Quark');
    expect(pausedByOf({ ...PAUSED, pausedByUsername: null }, 'admin-2')).toBe(
      ACCOUNT_SINCE_CLOSED,
    );
    expect(
      pausedByOf(
        { ...PAUSED, pausedByUserId: null, pausedByUsername: 'Quark' },
        null,
      ),
    ).toBe('Quark');
    expect(
      pausedByOf(
        { ...PAUSED, pausedByUserId: null, pausedByUsername: null },
        'admin-1',
      ),
    ).toBe('Unknown');
  });
});

describe('pauseOutcome (FC-042)', () => {
  it('says what a pause or resume came to, with the queues or without', () => {
    expect(pauseOutcome(PAUSED)).toBe('Publication paused.');
    expect(pauseOutcome({ ...PAUSED, queuePaused: null })).toBe(
      'Publication paused. The job queues can’t be reached just now; ' +
        'nothing is published meanwhile.',
    );
    expect(pauseOutcome(RUNNING)).toBe(
      'Publication resumed. Everything held is publishing.',
    );
    expect(pauseOutcome({ ...RUNNING, queuePaused: null, held: null })).toBe(
      'Publication resumed. Everything held publishes once the job queues ' +
        'can be reached.',
    );
  });
});

describe('PublicationPauseComponent (FC-042)', () => {
  let fixture: ComponentFixture<PublicationPauseComponent>;
  let pause: { read: jest.Mock; set: jest.Mock };
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    pause = {
      read: jest.fn(() => of(RUNNING)),
      set: jest.fn(() => of(PAUSED)),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of('Bad batch') })),
    };
    TestBed.configureTestingModule({
      imports: [PublicationPauseComponent],
      providers: [
        provideRouter([]),
        { provide: PublicationPauseAdminService, useValue: pause },
        { provide: AuthService, useValue: { getUserId: () => 'admin-1' } },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  /** Shows the control. */
  const show = async () => {
    fixture = TestBed.createComponent(PublicationPauseComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  const details = () =>
    [...element().querySelectorAll('dd')].map(each =>
      each.textContent?.replace(/\s+/g, ' ').trim(),
    );

  it('explains the pause, links to its help, and says it is running', async () => {
    await show();

    expect(text()).toContain(
      'Uploads are still accepted and scanned, but nothing is published ' +
        'until publication resumes; then everything held publishes.',
    );
    expect(text()).toContain('Publication is running.');
    expect(
      element().querySelector('a[href="/help/site-admin-scanning"]'),
    ).not.toBeNull();
    expect(button('Resume publication')).toBeUndefined();
    expect(
      element()
        .querySelector('.publication-pause')
        ?.classList.contains('publication-pause--paused'),
    ).toBe(false);
  });

  it('pauses it with a reason, and shows since when and by whom', async () => {
    await show();

    button('Pause publication')!.click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Pause publication',
          label: 'Reason',
          confirmText: 'Pause publication',
          max: ADMIN_REASON_MAX_LENGTH,
        }),
      }),
    );
    expect(pause.set).toHaveBeenCalledWith('pause', 'Bad batch');
    expect(text()).toContain('Publication paused.');
    expect(text()).toContain('Publication is paused.');
    expect(details()).toEqual(['Sep 30, 2026, 10:00:00 AM', 'You', '3']);
    expect(
      element()
        .querySelector('.publication-pause')
        ?.classList.contains('publication-pause--paused'),
    ).toBe(true);
  });

  it('resumes it with a reason', async () => {
    pause.read.mockReturnValue(of(PAUSED));
    pause.set.mockReturnValue(of(RUNNING));
    await show();

    button('Resume publication')!.click();
    await fixture.whenStable();

    expect(pause.set).toHaveBeenCalledWith('resume', 'Bad batch');
    expect(text()).toContain(
      'Publication resumed. Everything held is publishing.',
    );
    expect(text()).toContain('Publication is running.');
  });

  it('names another site admin, and says what it does not know', async () => {
    pause.read.mockReturnValue(
      of({ ...PAUSED, pausedAt: null, pausedByUserId: 'admin-2', held: null }),
    );
    await show();

    expect(details()).toEqual(['Unknown', 'Quark']);

    pause.read.mockReturnValue(
      of({
        ...PAUSED,
        pausedByUserId: 'admin-2',
        pausedByUsername: null,
        held: null,
      }),
    );
    fixture.componentInstance.load();
    await fixture.whenStable();

    expect(details()).toEqual([
      'Sep 30, 2026, 10:00:00 AM',
      'An account since closed',
    ]);
  });

  // While the job queues cannot be reached the switch still changes; the
  // queue follows it once they answer, and no count can be read.
  it('pauses while the job queues cannot be reached, and says so', async () => {
    pause.set.mockReturnValue(of({ ...PAUSED, queuePaused: null, held: null }));
    await show();

    button('Pause publication')!.click();
    await fixture.whenStable();

    expect(text()).toContain(
      'Publication paused. The job queues can’t be reached just now; ' +
        'nothing is published meanwhile.',
    );
    expect(text()).toContain(
      'The job queues can’t be reached just now; they will be paused as ' +
        'soon as they answer, and nothing is published meanwhile.',
    );
    expect(text()).not.toContain('Waiting to be published');
  });

  it('resumes while the job queues cannot be reached, and says so', async () => {
    pause.read.mockReturnValue(of(PAUSED));
    pause.set.mockReturnValue(
      of({ ...RUNNING, queuePaused: null, held: null }),
    );
    await show();

    button('Resume publication')!.click();
    await fixture.whenStable();

    expect(text()).toContain(
      'Publication resumed. Everything held publishes once the job queues ' +
        'can be reached.',
    );
    expect(text()).toContain(
      'Publication is running. The job queues can’t be reached just now, ' +
        'so nothing is published until they answer.',
    );
  });

  it('shows the server’s reason when it refuses, and reads the switch again', async () => {
    pause.set.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Publication is already paused.' },
          }),
      ),
    );
    await show();
    pause.read.mockReturnValue(of(PAUSED));

    button('Pause publication')!.click();
    await fixture.whenStable();

    expect(text()).toContain('Publication is already paused.');
    expect(pause.read).toHaveBeenCalledTimes(2);
    expect(button('Resume publication')).toBeDefined();
  });

  it('says so in its own words when the server gives no reason', async () => {
    pause.set.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: null })),
    );
    await show();

    button('Pause publication')!.click();
    await fixture.whenStable();
    expect(text()).toContain(PUBLICATION_PAUSE_ERROR);

    pause.set.mockReturnValue(throwError(() => new Error('offline')));
    button('Pause publication')!.click();
    await fixture.whenStable();
    expect(text()).toContain(PUBLICATION_PAUSE_ERROR);
  });

  it('does nothing when the dialog is cancelled', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    await show();

    button('Pause publication')!.click();

    expect(pause.set).not.toHaveBeenCalled();
  });

  it('says while it reads, and when it cannot, reading again when asked', async () => {
    pause.read.mockReturnValue(new Subject());
    await show();
    expect(text()).toContain('Reading whether publication is paused…');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PublicationPauseComponent],
      providers: [
        provideRouter([]),
        { provide: PublicationPauseAdminService, useValue: pause },
        { provide: AuthService, useValue: { getUserId: () => null } },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
    pause.read.mockReturnValue(throwError(() => new Error('down')));
    await show();
    expect(text()).toContain(
      'Whether publication is paused could not be read.',
    );

    pause.read.mockReturnValue(of(PAUSED));
    button('Try again')!.click();
    await fixture.whenStable();

    expect(details()).toContain('Quark');
  });
});
