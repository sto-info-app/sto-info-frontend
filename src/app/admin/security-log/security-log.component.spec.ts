import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  SecurityLogEntry,
  SecurityLogSource,
} from 'src/app/models/security-log.models';

import { SecurityLogAdminService } from './security-log-admin.service';
import { SecurityLogComponent } from './security-log.component';

/**
 * An entry.
 *
 * @param overrides - What differs.
 * @returns The entry.
 */
const entryOf = (
  overrides: Partial<SecurityLogEntry> = {},
): SecurityLogEntry => ({
  source: SecurityLogSource.SITE_ADMIN,
  id: 'entry-1',
  at: '2026-09-29T10:00:00.000Z',
  action: 'USER_DISABLED',
  actor: { userId: 'admin-1', username: 'Quark' },
  target: { userId: 'member-1', username: 'Rom' },
  subjectKind: null,
  subjectId: null,
  reason: 'Spamming',
  detail: null,
  ...overrides,
});

describe('SecurityLogComponent (FC-039)', () => {
  let fixture: ComponentFixture<SecurityLogComponent>;
  let log: { list: jest.Mock };

  beforeEach(() => {
    log = {
      list: jest.fn(() =>
        of({
          items: [
            entryOf(),
            entryOf({
              source: SecurityLogSource.HOLD,
              id: 'entry-2',
              action: 'REVIEW_DUE',
              actor: null,
              target: null,
              subjectKind: 'MODERATION_HOLD',
              subjectId: 'hold-1',
              reason: 'Its review date passed.',
              detail: { told: 2, reviewAt: '2026-09-28T10:00:00.000Z' },
            }),
            entryOf({
              source: SecurityLogSource.RETENTION,
              id: 'entry-3',
              action: 'CHAT_MESSAGES',
              actor: null,
              target: null,
              reason: null,
              detail: { counts: { purged: 3 }, finishedAt: null },
            }),
            entryOf({
              source: SecurityLogSource.FLEET,
              id: 'entry-4',
              action: 'SUSPENDED',
              actor: null,
              target: { userId: 'owner-1', username: null },
              subjectKind: 'COMMUNITY',
              subjectId: 'community-1',
            }),
            entryOf({
              source: SecurityLogSource.ERASURE,
              id: 'entry-5',
              action: 'REPLAYED',
              target: null,
            }),
            entryOf({
              source: SecurityLogSource.INVESTIGATION,
              id: 'entry-6',
              action: 'SOMETHING_NEW',
              target: null,
            }),
            entryOf({
              id: 'entry-7',
              action: 'A_LATER_ACTION',
              target: null,
            }),
            entryOf({
              source: SecurityLogSource.HOLD,
              id: 'entry-8',
              action: 'A_LATER_STEP',
              target: null,
            }),
          ],
          total: 120,
          page: 1,
          pageSize: 50,
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [SecurityLogComponent],
      providers: [
        provideRouter([]),
        { provide: SecurityLogAdminService, useValue: log },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  /** Shows the page. */
  const show = async () => {
    fixture = TestBed.createComponent(SecurityLogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement;
  const rows = () =>
    [...element().querySelectorAll('tbody tr')].map(
      row => row.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

  it('reads every source, newest first, and says each entry in words', async () => {
    await show();

    expect(log.list).toHaveBeenCalledWith(null, 1);
    expect(rows()[0]).toContain('Quark');
    expect(rows()[0]).toContain('Disabled an account');
    expect(rows()[0]).toContain('Rom');
    expect(rows()[0]).toContain('Spamming');
    expect(rows()[1]).toContain('The system');
    expect(rows()[1]).toContain('Owner told the review is due');
    expect(rows()[1]).toContain('Moderation hold hold-1');
    expect(rows()[1]).toContain('told: 2');
    expect(rows()[2]).toContain('Retention: chat messages');
    expect(rows()[2]).toContain('counts: {"purged":3}');
    expect(rows()[2]).not.toContain('finishedAt');
    expect(rows()[2]).toContain('—');
    expect(rows()[3]).toContain('An account since closed');
    expect(rows()[3]).toContain('Suspended');
    expect(rows()[3]).toContain('An account with no username');
    expect(rows()[4]).toContain('Replayed an erasure after a restore');
    expect(rows()[5]).toContain('Something new');
    expect(rows()[6]).toContain('A later action');
    expect(rows()[7]).toContain('A later step');
  });

  it('shows one source only, from the first page', async () => {
    await show();

    button('Older').click();
    await fixture.whenStable();
    expect(log.list).toHaveBeenLastCalledWith(null, 2);

    const select = element().querySelector('select') as HTMLSelectElement;

    select.value = SecurityLogSource.HOLD;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(log.list).toHaveBeenLastCalledWith(SecurityLogSource.HOLD, 1);

    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(log.list).toHaveBeenLastCalledWith(null, 1);
  });

  it('pages through the log', async () => {
    await show();

    expect(text()).toContain('Page 1 of 3');
    expect(button('Newer').disabled).toBe(true);

    button('Older').click();
    await fixture.whenStable();
    button('Newer').click();

    expect(log.list).toHaveBeenLastCalledWith(null, 1);
  });

  it('says when nothing is logged, or the log cannot be read', async () => {
    log.list.mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 50 }),
    );
    await show();
    expect(text()).toContain('Nothing has been logged here yet.');

    log.list.mockReturnValue(throwError(() => new Error('down')));
    await show();
    expect(text()).toContain('The log could not be read.');
    expect(text()).not.toContain('Nothing has been logged here yet.');
  });
});
