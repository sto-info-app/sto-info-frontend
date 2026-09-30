import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  RescanCampaign,
  RescanCampaignKind,
  RescanCampaignState,
  RescanOverview,
} from 'src/app/models/rescan.models';

import { RescanAdminService } from './rescan-admin.service';
import { RescanPanelComponent } from './rescan-panel.component';

/**
 * Where the campaigns stand.
 *
 * @param overrides - What differs.
 * @returns The overview.
 */
const overviewOf = (
  overrides: Partial<RescanOverview> = {},
): RescanOverview => ({
  campaigns: [],
  waiting: 3,
  unverified: 12,
  findings: [],
  ...overrides,
});

const CAMPAIGN: RescanCampaign = {
  id: 'campaign-1',
  kind: RescanCampaignKind.MANUAL,
  state: RescanCampaignState.RUNNING,
  selection: {},
  counts: { requested: 4, clean: 2, mystery: 1 },
  lastError: null,
  createdAt: '2026-09-29T10:00:00.000Z',
  finishedAt: null,
};

describe('RescanPanelComponent (FC-041)', () => {
  let fixture: ComponentFixture<RescanPanelComponent>;
  let rescans: {
    overview: jest.Mock;
    start: jest.Mock;
    act: jest.Mock;
    decide: jest.Mock;
  };
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    rescans = {
      overview: jest.fn(() => of(overviewOf())),
      start: jest.fn(() => of({})),
      act: jest.fn(() => of({})),
      decide: jest.fn(() => of(undefined)),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of('Because') })),
    };
    TestBed.configureTestingModule({
      imports: [RescanPanelComponent],
      providers: [
        { provide: RescanAdminService, useValue: rescans },
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
    fixture = TestBed.createComponent(RescanPanelComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  const input = (selector: string) =>
    element().querySelector(selector) as HTMLInputElement;

  /**
   * Changes a field as a site admin would.
   *
   * @param field - The field.
   * @param value - Its new value.
   */
  const change = (
    field: HTMLInputElement | HTMLSelectElement,
    value: string,
  ) => {
    field.value = value;
    field.dispatchEvent(new Event('change'));
  };

  it('says what is waiting, and that no campaign has run', async () => {
    await show();

    expect(text()).toMatch(/Waiting for a verdict\s*3/);
    expect(text()).toMatch(/Never scanned\s*12/);
    expect(text()).toContain('No campaign has run.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('shows a running campaign with its counts, and pauses it', async () => {
    rescans.overview.mockReturnValue(of(overviewOf({ campaigns: [CAMPAIGN] })));
    await show();

    expect(text()).toContain('Chosen by a site admin: Running');
    expect(text()).toMatch(/Asked for\s*4/);
    expect(text()).toMatch(/Clean\s*2/);
    expect(text()).toMatch(/mystery\s*1/);
    expect(button('Resume')).toBeUndefined();

    button('Pause')!.click();

    expect(rescans.act).toHaveBeenCalledWith('campaign-1', 'pause', 'Because');
    expect(text()).toContain('Paused.');
    expect(rescans.overview).toHaveBeenCalledTimes(2);
  });

  it('resumes or cancels a stopped campaign, and shows why it stopped', async () => {
    rescans.overview.mockReturnValue(
      of(
        overviewOf({
          campaigns: [
            {
              ...CAMPAIGN,
              kind: RescanCampaignKind.LEGACY,
              state: RescanCampaignState.FAILED,
              lastError: 'The quarantine bucket is down',
            },
          ],
        }),
      ),
    );
    await show();

    expect(text()).toContain(
      'Pictures from before scanning: Stopped by an error',
    );
    expect(text()).toContain('The quarantine bucket is down');
    expect(button('Pause')).toBeUndefined();

    button('Resume')!.click();

    expect(rescans.act).toHaveBeenCalledWith('campaign-1', 'resume', 'Because');
    expect(text()).toContain('Resumed.');

    button('Cancel')!.click();

    expect(rescans.act).toHaveBeenCalledWith('campaign-1', 'cancel', 'Because');
    expect(text()).toContain('Cancelled.');
  });

  it('offers nothing for a finished campaign', async () => {
    rescans.overview.mockReturnValue(
      of(
        overviewOf({
          campaigns: [
            {
              ...CAMPAIGN,
              state: RescanCampaignState.DONE,
              finishedAt: '2026-09-29T11:00:00.000Z',
            },
            {
              ...CAMPAIGN,
              id: 'campaign-2',
              state: RescanCampaignState.CANCELLED,
              finishedAt: '2026-09-29T12:00:00.000Z',
            },
          ],
        }),
      ),
    );
    await show();

    expect(text()).toContain('Chosen by a site admin: Finished');
    expect(text()).toContain('Chosen by a site admin: Cancelled');
    expect(text()).toContain('finished');
    expect(button('Pause')).toBeUndefined();
    expect(button('Resume')).toBeUndefined();
    expect(button('Cancel')).toBeUndefined();
  });

  it('lists what was found infected or refused, by asset and code', async () => {
    rescans.overview.mockReturnValue(
      of(
        overviewOf({
          findings: [
            {
              id: 'rescan-1',
              assetId: 'asset-1',
              state: 'INFECTED',
              rejectionCode: 'INFECTED',
              verdictAt: '2026-09-29T10:05:00.000Z',
            },
            {
              id: 'rescan-2',
              assetId: 'asset-2',
              state: 'REFUSED',
              rejectionCode: null,
              verdictAt: null,
            },
          ],
        }),
      ),
    );
    await show();

    const rows = [...element().querySelectorAll('tbody tr')].map(row =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(rows[0]).toContain('asset-1');
    expect(rows[0]).toContain('Infected, taken down');
    expect(rows[0]).toContain('INFECTED');
    expect(rows[1]).toContain('asset-2');
    expect(rows[1]).toContain('Refused for policy, still up');
    expect(rows[1]).toMatch(/— .*—/);
    // Only a policy refusal waits on a decision (FC-050).
    expect(rows[0]).not.toContain('Take it down');
    expect(rows[1]).toContain('Take it down');
    expect(rows[1]).toContain('Keep it');
  });

  describe('deciding a policy refusal (FC-050)', () => {
    const REFUSAL = {
      id: 'rescan-2',
      assetId: 'asset-2',
      state: 'REFUSED' as const,
      rejectionCode: 'DIMENSIONS_EXCEEDED',
      verdictAt: '2026-09-29T10:05:00.000Z',
    };

    beforeEach(() => {
      rescans.overview.mockReturnValue(of(overviewOf({ findings: [REFUSAL] })));
    });

    it.each([
      ['Take it down', 'TAKEN_DOWN', 'Taken down.', 'Take the picture down'],
      ['Keep it', 'KEPT', 'Kept.', 'Keep the picture'],
    ])(
      '%s, with the reason given, and reads the list again',
      async (label, decision, done, title) => {
        await show();

        button(label)!.click();

        expect(dialog.open).toHaveBeenCalledWith(
          GovernanceReasonDialogComponent,
          expect.objectContaining({
            data: expect.objectContaining({ title }),
          }),
        );
        expect(rescans.decide).toHaveBeenCalledWith(
          'rescan-2',
          decision,
          'Because',
        );
        expect(text()).toContain(done);
        expect(rescans.overview).toHaveBeenCalledTimes(2);
      },
    );

    it('decides nothing when the dialog is closed without a reason', async () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      await show();

      button('Keep it')!.click();

      expect(rescans.decide).not.toHaveBeenCalled();
    });

    it('says why the server would not decide it', async () => {
      rescans.decide.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'That finding has already been decided.' },
            }),
        ),
      );
      await show();

      button('Keep it')!.click();

      expect(text()).toContain('That finding has already been decided.');
    });
  });

  it('starts a campaign over everything, behind others, with the reason given', async () => {
    await show();

    button('Start a campaign')!.click();

    expect(dialog.open).toHaveBeenCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Reason', max: 500 }),
      }),
    );
    expect(rescans.start).toHaveBeenCalledWith({ priority: 'LOW' }, 'Because');
    expect(text()).toContain('Campaign started.');
  });

  it('starts a campaign over the selection chosen', async () => {
    await show();

    const kinds = [
      ...element().querySelectorAll<HTMLInputElement>(
        '.rescan__kinds input[type="checkbox"]',
      ),
    ];

    expect(kinds).toHaveLength(5);
    kinds[0].click();
    kinds[4].click();
    kinds[0].click();
    change(input('#rescan-from'), '2026-01-01');
    change(input('#rescan-before'), '2026-09-01');
    change(input('#rescan-days'), '30');
    change(
      element().querySelector('#rescan-priority') as HTMLSelectElement,
      'HIGH',
    );
    const checks = element().querySelectorAll<HTMLInputElement>(
      '.rescan__check input',
    );

    checks[checks.length - 1].click();

    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(rescans.start).toHaveBeenCalledWith(
      {
        kinds: ['FLEET_IMAGE'],
        uploadedFrom: '2026-01-01T00:00:00.000Z',
        uploadedBefore: '2026-09-01T00:00:00.000Z',
        notScannedForDays: 30,
        unverifiedOnly: true,
        priority: 'HIGH',
      },
      'Because',
    );
  });

  it('starts nothing when the dialog is closed without a reason', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    rescans.overview.mockReturnValue(of(overviewOf({ campaigns: [CAMPAIGN] })));
    await show();

    button('Start a campaign')!.click();
    button('Cancel')!.click();

    expect(rescans.start).not.toHaveBeenCalled();
    expect(rescans.act).not.toHaveBeenCalled();
  });

  it('says what the server refused, or that something went wrong', async () => {
    await show();

    rescans.start.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Choose at least one picture kind.' },
          }),
      ),
    );
    button('Start a campaign')!.click();

    expect(text()).toContain('Choose at least one picture kind.');

    rescans.start.mockReturnValue(throwError(() => new Error('down')));
    button('Start a campaign')!.click();

    expect(text()).toContain('That could not be done. Please try again.');

    rescans.start.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: null })),
    );
    button('Start a campaign')!.click();

    expect(text()).toContain('That could not be done. Please try again.');
  });

  it('says while it reads, and when it cannot', async () => {
    rescans.overview.mockReturnValue(new Subject());
    await show();

    expect(text()).toContain('Reading the campaigns');

    rescans.overview.mockReturnValue(throwError(() => new Error('down')));
    fixture.componentInstance.load();
    await fixture.whenStable();

    expect(text()).toContain('The campaigns could not be read.');
  });
});
