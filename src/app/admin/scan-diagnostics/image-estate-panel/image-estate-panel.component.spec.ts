import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  ImageEstateRunKind,
  ImageEstateRunState,
  ImageEstateStatus,
} from 'src/app/models/image-estate.models';

import { ImageEstateAdminService } from './image-estate-admin.service';
import { ImageEstatePanelComponent } from './image-estate-panel.component';

/**
 * Where the estate stands.
 *
 * @param overrides - What differs.
 * @returns The status.
 */
const statusOf = (
  overrides: Partial<ImageEstateStatus> = {},
): ImageEstateStatus => ({
  signingEnabled: true,
  remaining: 7,
  steps: {},
  run: null,
  inventory: null,
  ...overrides,
});

const RUN = {
  id: 'run-1',
  kind: ImageEstateRunKind.COPY,
  state: ImageEstateRunState.RUNNING,
  counts: { registered: 1, copied: 5, mystery: 2 },
  lastError: null,
  createdAt: '2026-09-29T10:00:00.000Z',
  finishedAt: null,
};

describe('ImageEstatePanelComponent (FC-040)', () => {
  let fixture: ComponentFixture<ImageEstatePanelComponent>;
  let estate: {
    status: jest.Mock;
    takeInventory: jest.Mock;
    start: jest.Mock;
    pause: jest.Mock;
    resume: jest.Mock;
  };
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    estate = {
      status: jest.fn(() => of(statusOf())),
      takeInventory: jest.fn(() => of({})),
      start: jest.fn(() => of({})),
      pause: jest.fn(() => of({})),
      resume: jest.fn(() => of({})),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of('Because') })),
    };
    TestBed.configureTestingModule({
      imports: [ImageEstatePanelComponent],
      providers: [
        { provide: ImageEstateAdminService, useValue: estate },
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
    fixture = TestBed.createComponent(ImageEstatePanelComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;

  it('says where the pictures stand, and offers a copy', async () => {
    estate.status.mockReturnValue(
      of(statusOf({ steps: { COPIED: 2, RETIRED: 1, ODD: 1 } })),
    );
    await show();

    expect(text()).toMatch(/Pictures still public\s*7/);
    expect(text()).toMatch(/Copied, old copy still public\s*2/);
    expect(text()).toMatch(/Copied, old copy deleted\s*1/);
    expect(text()).toMatch(/ODD\s*1/);
    expect(button('Copy to private')?.disabled).toBe(false);
    expect(button('Undo copies')?.disabled).toBe(false);
    expect(button('Retire old copies')?.disabled).toBe(false);
  });

  it('says when the signing key is not set, and offers no copy', async () => {
    estate.status.mockReturnValue(of(statusOf({ signingEnabled: false })));
    await show();

    expect(text()).toContain('The Images signing key is not set');
    expect(button('Copy to private')?.disabled).toBe(true);
    expect(button('Undo copies')?.disabled).toBe(true);
  });

  it('shows the running run with its counts, and offers a pause', async () => {
    estate.status.mockReturnValue(of(statusOf({ run: RUN })));
    await show();

    expect(text()).toContain('Copy to private: Running');
    expect(text()).toMatch(/Registered as unverified\s*1/);
    expect(text()).toMatch(/Copied\s*5/);
    expect(text()).toMatch(/mystery\s*2/);
    expect(button('Copy to private')).toBeUndefined();

    button('Pause')!.click();

    expect(estate.pause).toHaveBeenCalledWith('Because');
    expect(text()).toContain('Paused.');
  });

  it('offers to resume a stopped run, and shows why it stopped', async () => {
    estate.status.mockReturnValue(
      of(
        statusOf({
          run: {
            ...RUN,
            state: ImageEstateRunState.FAILED,
            lastError: 'Cloudflare is down',
          },
        }),
      ),
    );
    await show();

    expect(text()).toContain('Cloudflare is down');

    button('Resume')!.click();

    expect(estate.resume).toHaveBeenCalledWith('Because');
  });

  it('shows a finished run, and allows another', async () => {
    estate.status.mockReturnValue(
      of(
        statusOf({
          run: {
            ...RUN,
            kind: ImageEstateRunKind.RETIRE,
            state: ImageEstateRunState.DONE,
            finishedAt: '2026-09-29T11:00:00.000Z',
          },
        }),
      ),
    );
    await show();

    expect(text()).toContain('Retire old copies: Finished');
    expect(text()).toContain('finished');
    expect(button('Copy to private')?.disabled).toBe(false);
  });

  it('starts a run with the reason given, logged by the server', async () => {
    await show();

    button('Copy to private')!.click();

    expect(dialog.open).toHaveBeenCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Reason', max: 500 }),
      }),
    );
    expect(estate.start).toHaveBeenCalledWith(
      ImageEstateRunKind.COPY,
      'Because',
    );
    expect(text()).toContain('Copy to private started.');
    expect(estate.status).toHaveBeenCalledTimes(2);
  });

  it('starts nothing when the dialog is closed without a reason', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    estate.status.mockReturnValue(of(statusOf({ steps: { COPIED: 1 } })));
    await show();

    button('Undo copies')!.click();
    button('Retire old copies')!.click();

    expect(estate.start).not.toHaveBeenCalled();
  });

  it('says what the server refused, or that something went wrong', async () => {
    await show();

    estate.start.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Another run is open. Finish it first.' },
          }),
      ),
    );
    button('Copy to private')!.click();

    expect(text()).toContain('Another run is open. Finish it first.');

    estate.takeInventory.mockReturnValue(throwError(() => new Error('down')));
    button('Take an inventory')!.click();

    expect(text()).toContain('That could not be done. Please try again.');

    estate.takeInventory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: null })),
    );
    button('Take an inventory')!.click();

    expect(text()).toContain('That could not be done. Please try again.');
  });

  it('takes an inventory, and shows the last one', async () => {
    estate.status.mockReturnValue(
      of(
        statusOf({
          inventory: {
            id: 'inventory-1',
            state: 'DONE',
            error: null,
            createdAt: '2026-09-29T09:00:00.000Z',
            finishedAt: '2026-09-29T09:01:00.000Z',
            report: {
              references: [
                {
                  table: 'user_profile',
                  column: 'profilePictureId',
                  rows: 4,
                  registered: 3,
                  r2: 0,
                },
              ],
              registry: [],
              steps: {},
              cloudflare: {
                listed: 5,
                private: 1,
                public: 4,
                orphans: 1,
                orphanIds: ['orphan-1'],
                awaitingRetirement: 0,
                missing: 1,
                missingAssetIds: ['asset-9'],
                elsewhere: 12,
              },
            },
          },
        }),
      ),
    );
    await show();

    expect(text()).toContain('user_profile.profilePictureId');
    expect(text()).toMatch(/In Cloudflare for this site\s*5/);
    expect(text()).toContain('Nothing points at: orphan-1');
    expect(text()).toContain('Missing from Cloudflare (asset IDs): asset-9');

    button('Take an inventory')!.click();

    expect(estate.takeInventory).toHaveBeenCalled();
    expect(text()).toContain('Taking an inventory.');
  });

  it('shows an inventory under way, or one Cloudflare failed', async () => {
    estate.status.mockReturnValue(
      of(
        statusOf({
          inventory: {
            id: 'inventory-1',
            state: 'RUNNING',
            error: null,
            createdAt: '2026-09-29T09:00:00.000Z',
            finishedAt: null,
            report: null,
          },
        }),
      ),
    );
    await show();

    expect(text()).toContain('Being taken.');
    expect(button('Take an inventory')?.disabled).toBe(true);

    estate.status.mockReturnValue(
      of(
        statusOf({
          inventory: {
            id: 'inventory-1',
            state: 'FAILED',
            error: 'Cloudflare is down',
            createdAt: '2026-09-29T09:00:00.000Z',
            finishedAt: '2026-09-29T09:01:00.000Z',
            report: {
              references: [],
              registry: [],
              steps: {},
              cloudflare: null,
            },
          },
        }),
      ),
    );
    button('Refresh')!.click();
    await fixture.whenStable();

    expect(text()).toContain(
      "Cloudflare's listing could not be read: Cloudflare is down",
    );
  });

  it('says while it reads, and when it cannot', async () => {
    estate.status.mockReturnValue(new Subject());
    await show();

    expect(text()).toContain('Reading where the pictures stand');

    estate.status.mockReturnValue(throwError(() => new Error('down')));
    fixture.componentInstance.load();
    await fixture.whenStable();

    expect(text()).toContain('Where the pictures stand could not be read.');
    expect(fixture.componentInstance.steps()).toEqual([]);
    expect(fixture.componentInstance.runCounts()).toEqual([]);
    expect(fixture.componentInstance.openRun()).toBeNull();
  });
});
