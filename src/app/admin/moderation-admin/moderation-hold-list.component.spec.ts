import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';

import {
  HeldMessage,
  ModerationHold,
  ModerationHoldAdminService,
  ModerationHoldDetail,
} from './moderation-hold-admin.service';
import { ModerationHoldExtendDialogComponent } from './moderation-hold-extend-dialog.component';
import { ModerationHoldListComponent } from './moderation-hold-list.component';

const HOLD: ModerationHold = {
  id: 'hold-1',
  kind: 'MEMBER_MESSAGES',
  chatReportId: null,
  subject: { userId: 'kira', username: 'Kira' },
  reason: 'Harassment case',
  owner: { userId: 'admin-1', username: 'Quark' },
  reviewAt: '2027-03-28T00:00:00.000Z',
  reviewDue: false,
  releasesAt: '2027-04-11T00:00:00.000Z',
  createdAt: '2026-09-29T10:00:00.000Z',
  releasedAt: null,
  releasedBy: null,
  releaseReason: null,
};

const DETAIL: ModerationHoldDetail = {
  ...HOLD,
  actions: [
    {
      action: 'PLACED',
      actor: { userId: 'admin-1', username: 'Quark' },
      automatic: false,
      reason: 'Harassment case',
      createdAt: '2026-09-29T10:00:00.000Z',
    },
  ],
};

/**
 * A kept message.
 *
 * @param overrides - What differs.
 * @returns The message.
 */
const heldOf = (overrides: Partial<HeldMessage> = {}): HeldMessage => ({
  id: 'message-1',
  place: {
    kind: 'CHANNEL',
    channelId: 'general',
    channelName: 'General',
    scopeKind: 'FLEET',
    scopeName: 'Fixture Fleet',
    conversationId: null,
  },
  with: null,
  author: { userId: 'kira', username: 'Kira' },
  body: 'The words',
  deleted: false,
  sentAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

describe('ModerationHoldListComponent', () => {
  let fixture: ComponentFixture<ModerationHoldListComponent>;
  let holds: {
    list: jest.Mock;
    detail: jest.Mock;
    extend: jest.Mock;
    release: jest.Mock;
    read: jest.Mock;
  };
  let dialogResult: unknown;
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    holds = {
      list: jest.fn(() => of([HOLD])),
      detail: jest.fn(() => of(DETAIL)),
      extend: jest.fn(() => of(DETAIL)),
      release: jest.fn(() =>
        of({
          ...DETAIL,
          releasedAt: '2026-09-30T00:00:00.000Z',
        }),
      ),
      read: jest.fn(() =>
        of({
          messages: [
            heldOf(),
            heldOf({
              id: 'message-2',
              place: {
                kind: 'DIRECT',
                channelId: null,
                channelName: null,
                scopeKind: null,
                scopeName: null,
                conversationId: 'talk',
              },
              with: { userId: 'odo', username: 'Odo' },
              deleted: true,
            }),
            heldOf({
              id: 'message-3',
              place: {
                kind: 'DIRECT',
                channelId: null,
                channelName: null,
                scopeKind: null,
                scopeName: null,
                conversationId: 'talk',
              },
              with: null,
              body: null,
            }),
            heldOf({
              id: 'message-4',
              place: {
                kind: 'CHANNEL',
                channelId: 'gone',
                channelName: null,
                scopeKind: null,
                scopeName: null,
                conversationId: null,
              },
            }),
          ],
          before: 'cursor-1',
        }),
      ),
    };
    dialogResult = undefined;
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })),
    };
    TestBed.configureTestingModule({
      imports: [ModerationHoldListComponent],
      providers: [
        provideRouter([]),
        { provide: ModerationHoldAdminService, useValue: holds },
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
    fixture = TestBed.createComponent(ModerationHoldListComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ??
    '';
  const button = (label: string): HTMLButtonElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      each =>
        each.textContent?.trim() === label ||
        each.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;
  const settle = () => fixture.whenStable();

  it('lists holds in force first, with who, why and when', async () => {
    await show();

    expect(holds.list).toHaveBeenCalledWith(true);
    expect(text()).toContain('Kira');
    expect(text()).toContain('Everything a member wrote in chat');
    expect(text()).toContain('Harassment case');
    expect(text()).toContain('Quark');
    expect(text()).toContain('In force');
  });

  it('shows due and released holds, filtered', async () => {
    holds.list.mockReturnValue(
      of([
        { ...HOLD, id: 'due', reviewDue: true, kind: 'CHAT_REPORT' },
        {
          ...HOLD,
          id: 'released',
          subject: null,
          releasesAt: null,
          releasedAt: '2026-09-30T00:00:00.000Z',
          releasedBy: { userId: 'admin-2', username: 'Odo' },
          releaseReason: 'Case closed',
        },
      ]),
    );
    await show();

    expect(text()).toContain('by Odo');
    expect(text()).toContain(
      'Released automaticallyApr 11, 2027, unless extended',
    );
    expect(text()).toContain('Review due');
    expect(text()).toContain('A chat report’s evidence');
    expect(text()).toContain('Released');
    expect(text()).toContain('Case closed');
    expect(button('Extend')).toBeDefined();

    const select = (fixture.nativeElement as HTMLElement).querySelector(
      '#hold-filter',
    ) as HTMLSelectElement;

    for (const [value, query] of [
      ['RELEASED', false],
      ['ALL', undefined],
    ] as const) {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      expect(holds.list).toHaveBeenLastCalledWith(query);
    }
  });

  it('names nobody for a hold STO Info released, and marks its steps automatic (FC-037)', async () => {
    const released: ModerationHold = {
      ...HOLD,
      releasesAt: null,
      releasedAt: '2027-04-11T05:03:00.000Z',
      releasedBy: null,
      releaseReason:
        'Released automatically: not reviewed within 14 days of its review date.',
    };

    holds.list.mockReturnValue(of([released]));
    holds.detail.mockReturnValue(
      of({
        ...released,
        actions: [
          {
            action: 'RELEASED',
            actor: null,
            automatic: true,
            reason: 'Released automatically',
            createdAt: '2027-04-11T05:03:00.000Z',
          },
          {
            action: 'RELEASE_WARNED',
            actor: null,
            automatic: true,
            reason: 'To be released in 7 days unless extended.',
            createdAt: '2027-04-04T05:03:00.000Z',
          },
          {
            action: 'REVIEW_DUE',
            actor: null,
            automatic: true,
            reason: 'Its review date passed.',
            createdAt: '2027-03-28T05:03:00.000Z',
          },
          ...DETAIL.actions,
        ],
      }),
    );
    await show();

    expect(text()).not.toContain(' by ');
    expect(text()).not.toContain('Released automaticallyApr');

    button('Show its log')!.click();
    fixture.detectChanges();

    expect(text()).toContain('Released (automatic)');
    expect(text()).toContain(
      'Site admins told it will be released (automatic)',
    );
    expect(text()).toContain('Owner told the review is due (automatic)');
    expect(text()).toContain('Placed by Quark');
  });

  it('says when there are none, or they cannot be read', async () => {
    holds.list.mockReturnValue(of([]));
    await show();
    expect(text()).toContain('No holds match this filter.');

    holds.list.mockReturnValue(throwError(() => new Error('down')));
    await show();
    expect(text()).toContain('Holds could not be read.');
  });

  it('reads what a hold keeps with a purpose, page by page, and puts it away', async () => {
    await show();

    button('Read what it keeps').click();
    expect(holds.read).not.toHaveBeenCalled();

    dialogResult = 'Reviewing the case';
    button('Read what it keeps').click();
    await settle();

    expect(dialog.open).toHaveBeenLastCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Purpose', min: 10 }),
      }),
    );
    expect(holds.read).toHaveBeenCalledWith(
      'hold-1',
      'Reviewing the case',
      undefined,
    );
    expect(text()).toContain('Read for: Reviewing the case');
    expect(text()).toContain('Fixture Fleet · # General');
    expect(text()).toContain('Direct message with Odo');
    expect(text()).toContain('· Deleted');
    expect(text()).toContain('Deleted before it was reported');
    expect(text()).toContain('# a removed channel');

    holds.read.mockReturnValue(of({ messages: [], before: null }));
    button('Earlier').click();
    await settle();

    expect(holds.read).toHaveBeenLastCalledWith(
      'hold-1',
      'Reviewing the case',
      'cursor-1',
    );
    expect(button('Earlier')).toBeUndefined();

    button('Put away').click();
    await settle();
    expect(text()).not.toContain('Read for:');
  });

  it('shows what is kept once nothing is left, and says when it cannot be read', async () => {
    holds.read.mockReturnValue(of({ messages: [], before: null }));
    await show();

    dialogResult = 'Reviewing the case';
    button('Read what it keeps').click();
    await settle();
    expect(text()).toContain('Nothing is kept any more.');

    holds.read.mockReturnValue(throwError(() => new Error('down')));
    button('Read what it keeps').click();
    await settle();
    expect(text()).toContain('What it keeps could not be read.');
  });

  it('shows and hides its log', async () => {
    await show();

    button('Show its log').click();
    await settle();
    expect(text()).toContain('Placed by Quark');

    button('Hide its log').click();
    await settle();
    expect(text()).not.toContain('Placed by Quark');
    expect(holds.detail).toHaveBeenCalledTimes(1);

    holds.detail.mockReturnValue(throwError(() => new Error('down')));
    button('Show its log').click();
    await settle();
    expect(text()).toContain('That hold could not be read.');
  });

  it('extends a hold to a date, with a reason', async () => {
    await show();

    button('Extend').click();
    expect(holds.extend).not.toHaveBeenCalled();

    dialogResult = { reviewAt: '2026-12-01T23:59:59.000Z', reason: 'More' };
    button('Extend').click();
    await settle();

    expect(dialog.open).toHaveBeenLastCalledWith(
      ModerationHoldExtendDialogComponent,
      { data: { subject: 'Kira', reviewAt: HOLD.reviewAt } },
    );
    expect(holds.extend).toHaveBeenCalledWith(
      'hold-1',
      '2026-12-01T23:59:59.000Z',
      'More',
    );
    expect(text()).toContain('The hold’s review date has moved.');
  });

  it('releases a hold with a reason, and says why it could not', async () => {
    await show();

    button('Release').click();
    expect(holds.release).not.toHaveBeenCalled();

    dialogResult = 'Case closed';
    button('Release').click();
    await settle();

    expect(holds.release).toHaveBeenCalledWith('hold-1', 'Case closed');
    expect(text()).toContain('The hold is released.');

    holds.release.mockReturnValue(
      throwError(() => ({ error: { message: 'Not found' } })),
    );
    button('Release').click();
    await settle();
    expect(text()).toContain('Not found');

    holds.release.mockReturnValue(throwError(() => ({})));
    button('Release').click();
    await settle();
    expect(text()).toContain('That hold could not be released.');
  });
});
