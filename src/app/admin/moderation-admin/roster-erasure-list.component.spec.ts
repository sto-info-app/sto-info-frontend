import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

import {
  RosterErasure,
  RosterErasureAdminService,
} from './roster-erasure-admin.service';
import { RosterErasureListComponent } from './roster-erasure-list.component';

const ERASURE: RosterErasure = {
  id: 'e1',
  pseudonym: '@erased-4f8a2c1e9b3d',
  reason: 'Verified in game',
  admin: { userId: 'admin-1', username: 'Quark' },
  replayed: false,
  observations: 3,
  aliases: 1,
  fleets: 2,
  createdAt: '2026-09-29T10:00:00.000Z',
};

const PREVIEW = {
  alreadyErased: false,
  rows: 3,
  fleets: [
    {
      fleetId: 'f1',
      fleetName: 'Ninth Fleet',
      communityName: 'Fixture Community',
      rows: 2,
    },
    { fleetId: 'f2', fleetName: 'Tenth Fleet', communityName: null, rows: 1 },
  ],
};

describe('RosterErasureListComponent (FC-038)', () => {
  let fixture: ComponentFixture<RosterErasureListComponent>;
  let erasures: {
    list: jest.Mock;
    preview: jest.Mock;
    erase: jest.Mock;
  };
  let dialogResult: unknown;
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    erasures = {
      list: jest.fn(() => of([ERASURE])),
      preview: jest.fn(() => of(PREVIEW)),
      erase: jest.fn(() =>
        of({ ...ERASURE, filesDeleted: 2, filesPending: 0 }),
      ),
    };
    dialogResult = true;
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })),
    };
    TestBed.configureTestingModule({
      imports: [RosterErasureListComponent],
      providers: [
        provideRouter([]),
        { provide: RosterErasureAdminService, useValue: erasures },
        { provide: MatDialog, useValue: dialog },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  /** Shows the page. */
  const show = async (): Promise<void> => {
    fixture = TestBed.createComponent(RosterErasureListComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => page().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string): HTMLButtonElement =>
    [...page().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement;

  /**
   * Types into a field.
   *
   * @param id - The field.
   * @param value - What to type.
   */
  const type = async (id: string, value: string): Promise<void> => {
    const field = page().querySelector(`#${id}`) as
      HTMLInputElement | HTMLTextAreaElement;

    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  /** Names Kira, and finds her rosters. */
  const find = async (): Promise<void> => {
    await type('erasure-character-name', 'Kira');
    await type('erasure-account-handle', ' @nerys ');
    button('Find their rosters').click();
    await fixture.whenStable();
  };

  it('lists erasures by pseudonym, never by name', async () => {
    erasures.list.mockReturnValue(
      of([
        ERASURE,
        { ...ERASURE, id: 'e2', admin: null },
        { ...ERASURE, id: 'e3', admin: null, replayed: true },
        { ...ERASURE, id: 'e4', admin: { userId: 'x', username: null } },
      ]),
    );
    await show();

    expect(text()).toContain('@erased-4f8a2c1e9b3d');
    expect(text()).toContain('Quark');
    expect(text()).toContain('An account since closed');
    expect(text()).toContain('Replayed from the ledger');
    expect(text()).toContain('An account with no username');
    expect(text()).toContain('3 row(s), 1 alias(es), 2 Fleet(s)');
    // The server replays the ledger by itself at start (FC-042).
    expect(text()).not.toContain('Replay the erasure ledger');
  });

  it('says when nothing has been erased, or the list cannot be read', async () => {
    erasures.list.mockReturnValue(of([]));
    await show();
    expect(text()).toContain("Nobody's roster data has been erased.");

    erasures.list.mockReturnValue(throwError(() => new Error('down')));
    await show();
    expect(text()).toContain('Erasures could not be read.');
  });

  it('finds which rosters name them before anything else', async () => {
    await show();

    expect(button('Find their rosters').disabled).toBe(true);

    await find();

    expect(erasures.preview).toHaveBeenCalledWith({
      characterName: 'Kira',
      accountHandle: '@nerys',
    });
    expect(text()).toContain('3 roster row(s) name them');
    expect(text()).toContain('Ninth Fleet');
    expect(text()).toContain('None');
    expect(button('Erase…').disabled).toBe(true);

    await type('erasure-character-name', 'Kira ');
    expect(page().querySelector('#erasure-reason')).toBeNull();
  });

  it('says when they are already erased, or no roster names them', async () => {
    erasures.preview.mockReturnValueOnce(
      of({ ...PREVIEW, alreadyErased: true }),
    );
    await show();
    await find();
    expect(text()).toContain('They are already erased.');
    expect(button('Erase…')).toBeUndefined();

    erasures.preview.mockReturnValueOnce(
      of({ ...PREVIEW, rows: 0, fleets: [] }),
    );
    await type('erasure-account-handle', '@nerys');
    button('Find their rosters').click();
    await fixture.whenStable();
    expect(text()).toContain('No roster names them now.');
  });

  it('erases once confirmed with a reason, and says what it did', async () => {
    await show();
    await find();
    await type('erasure-reason', 'Verified in game');
    button('Erase…').click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Erase their roster data?' }),
      }),
    );
    expect(erasures.erase).toHaveBeenCalledWith({
      characterName: 'Kira',
      accountHandle: '@nerys',
      reason: 'Verified in game',
    });
    expect(text()).toContain(
      'Erased as @erased-4f8a2c1e9b3d: 3 roster row(s) in 2 Fleet(s) anonymised and 2 file(s) deleted.',
    );
    expect(text()).not.toContain('could not be deleted now');
    expect(erasures.list).toHaveBeenCalledTimes(2);
  });

  it('says when files are left for tonight', async () => {
    erasures.erase.mockReturnValue(
      of({ ...ERASURE, filesDeleted: 1, filesPending: 2 }),
    );
    await show();
    await find();
    await type('erasure-reason', 'Verified in game');
    button('Erase…').click();
    await fixture.whenStable();

    expect(text()).toContain('2 file(s) could not be deleted now');
  });

  it('erases nothing when not confirmed', async () => {
    dialogResult = false;
    await show();
    await find();
    await type('erasure-reason', 'Verified in game');
    button('Erase…').click();
    await fixture.whenStable();

    expect(erasures.erase).not.toHaveBeenCalled();
  });

  it('gives the server’s reason for a refusal, or a general one', async () => {
    erasures.erase.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'They are already erased.' },
          }),
      ),
    );
    await show();
    await find();
    await type('erasure-reason', 'Verified in game');
    button('Erase…').click();
    await fixture.whenStable();
    expect(text()).toContain('They are already erased.');

    erasures.preview.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503, error: null })),
    );
    button('Find their rosters').click();
    await fixture.whenStable();
    expect(text()).toContain('That could not be done. Please try again.');

    erasures.preview.mockReturnValue(throwError(() => new Error('offline')));
    button('Find their rosters').click();
    await fixture.whenStable();
    expect(text()).toContain('That could not be done. Please try again.');
  });
});
