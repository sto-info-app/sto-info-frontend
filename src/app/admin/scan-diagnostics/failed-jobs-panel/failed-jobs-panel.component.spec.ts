import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  FailedJob,
  FailedJobPage,
  FailedJobQueue,
} from 'src/app/models/failed-jobs.models';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';

import { FailedJobsAdminService } from './failed-jobs-admin.service';
import {
  countOf,
  discardOutcome,
  FAILED_JOB_ACTION_ERROR,
  FAILED_JOBS_READ_ERROR,
  FailedJobsPanelComponent,
  retryAllOutcome,
} from './failed-jobs-panel.component';

/**
 * A failed job.
 *
 * @param overrides - What differs.
 * @returns The job.
 */
const jobOf = (overrides: Partial<FailedJob> = {}): FailedJob => ({
  queue: 'file-asset-publication',
  jobId: 'asset-1',
  name: 'publish',
  attemptsMade: 5,
  failedAt: '2026-09-30T10:00:00.000Z',
  subjectKind: 'FILE_ASSET',
  subjectId: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  reason: 'ECONNREFUSED',
  retryable: true,
  notRetryableBecause: null,
  ...overrides,
});

/**
 * A page of failed jobs.
 *
 * @param items - Its jobs.
 * @param overrides - What differs.
 * @returns The page.
 */
const pageOf = (
  items: FailedJob[],
  overrides: Partial<FailedJobPage> = {},
): FailedJobPage => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25,
  counts: {
    'file-scan': 0,
    'file-scan-verdict': 0,
    'file-asset-publication': items.length,
    'chat-transcript': 0,
    'fleet-roster-replay': null,
  },
  ...overrides,
});

describe('countOf (FC-042)', () => {
  it('counts in the singular and the plural', () => {
    expect(countOf(1, 'job')).toBe('1 job');
    expect(countOf(0, 'job')).toBe('0 jobs');
    expect(countOf(3, 'job')).toBe('3 jobs');
  });
});

describe('retryAllOutcome (FC-042)', () => {
  it('says what was retried and left, and when to press again', () => {
    expect(retryAllOutcome({ retried: 3, skipped: 1, remaining: 1 })).toBe(
      'Retried 3 jobs; left 1 that a retry can’t help.',
    );
    expect(retryAllOutcome({ retried: 1, skipped: 0, remaining: null })).toBe(
      'Retried 1 job; left 0 that a retry can’t help.',
    );
    expect(retryAllOutcome({ retried: 500, skipped: 0, remaining: 20 })).toBe(
      'Retried 500 jobs; left 0 that a retry can’t help. More are left ' +
        'than one press looks at: press Retry all again.',
    );
  });
});

describe('discardOutcome (FC-042)', () => {
  it('says what was discarded and kept, and when to press again', () => {
    expect(discardOutcome({ discarded: 2, kept: 1, remaining: 1 })).toBe(
      'Discarded 2 jobs; kept 1 that a retry could still help.',
    );
    expect(discardOutcome({ discarded: 1, kept: 0, remaining: null })).toBe(
      'Discarded 1 job; kept 0 that a retry could still help.',
    );
    expect(discardOutcome({ discarded: 500, kept: 2, remaining: 9 })).toBe(
      'Discarded 500 jobs; kept 2 that a retry could still help. More are ' +
        'left than one press looks at: press it again.',
    );
  });
});

describe('FailedJobsPanelComponent (FC-042)', () => {
  let fixture: ComponentFixture<FailedJobsPanelComponent>;
  let failedJobs: {
    list: jest.Mock;
    retry: jest.Mock;
    discard: jest.Mock;
    retryAll: jest.Mock;
    discardUnretryable: jest.Mock;
  };
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    failedJobs = {
      list: jest.fn(() => of(pageOf([]))),
      retry: jest.fn(() => of(undefined)),
      discard: jest.fn(() => of(undefined)),
      retryAll: jest.fn(() => of({ retried: 2, skipped: 1, remaining: 1 })),
      discardUnretryable: jest.fn(() =>
        of({ discarded: 1, kept: 2, remaining: 2 }),
      ),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of('Because') })),
    };
    TestBed.configureTestingModule({
      imports: [FailedJobsPanelComponent],
      providers: [
        { provide: FailedJobsAdminService, useValue: failedJobs },
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
    fixture = TestBed.createComponent(FailedJobsPanelComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const buttons = (label: string) =>
    [...element().querySelectorAll('button')].filter(
      each => each.textContent?.trim() === label,
    );
  const button = (label: string) => buttons(label)[0];

  /**
   * An element's words as a reader takes them in: a note set on a line of
   * its own is a word apart from what comes before it.
   *
   * @param node - The element.
   * @returns Its text nodes, spaced and trimmed.
   */
  const words = (node: Node): string => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];

    while (walker.nextNode()) {
      parts.push(walker.currentNode.textContent ?? '');
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };
  const cells = (row: number) =>
    Array.from(
      element().querySelectorAll('tbody tr')[row].querySelectorAll('td'),
      words,
    );
  const select = () =>
    element().querySelector('#failed-jobs-queue') as HTMLSelectElement;
  const dialogData = () =>
    (dialog.open.mock.calls.at(-1) as [unknown, { data: unknown }])[1].data;

  /**
   * Chooses a queue as a site admin would.
   *
   * @param value - The option's value.
   */
  const choose = (value: string) => {
    select().value = value;
    select().dispatchEvent(new Event('change'));
  };

  it('reads every queue from the first page, and says when nothing failed', async () => {
    await show();

    expect(failedJobs.list).toHaveBeenCalledWith(null, 1);
    expect(text()).toContain('No background job has failed.');
    expect(element().querySelector('table')).toBeNull();
    expect(button('Retry all')).toBeUndefined();
  });

  it('says while it reads', async () => {
    failedJobs.list.mockReturnValue(new Subject());
    await show();

    expect(text()).toContain('Reading the failed jobs…');
  });

  it('says when they cannot be read, and reads again when asked', async () => {
    failedJobs.list.mockReturnValue(throwError(() => new Error('down')));
    await show();

    expect(text()).toContain(FAILED_JOBS_READ_ERROR);

    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    button('Try again').click();
    await fixture.whenStable();

    expect(element().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  // The backend answers 503 with its own words while Redis is down.
  it('shows the server’s words when the job queues cannot be reached', async () => {
    failedJobs.list.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { message: 'The job queues cannot be reached.' },
          }),
      ),
    );
    await show();

    expect(text()).toContain('The job queues cannot be reached.');
    expect(text()).not.toContain(FAILED_JOBS_READ_ERROR);
    expect(text()).not.toContain('No background job has failed.');
  });

  it('shows a part-way 503 from Retry all, and what the list now says', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    failedJobs.retryAll.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              message:
                'The job queues stopped answering part way; what was done ' +
                'has been logged in the Security Log.',
            },
          }),
      ),
    );
    await show();
    failedJobs.list.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { message: 'The job queues cannot be reached.' },
          }),
      ),
    );

    button('Retry all').click();
    await fixture.whenStable();

    expect(text()).toContain(
      'The job queues stopped answering part way; what was done has been ' +
        'logged in the Security Log.',
    );
    expect(text()).toContain('The job queues cannot be reached.');
  });

  // Steve's decision: a page view is one Security Log entry, and the server
  // logs the list apart only for a queue chosen or a later page.
  it('goes back to every queue’s first page when the page refreshes', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()], { total: 60 })));
    await show();
    choose('file-scan');
    await fixture.whenStable();
    button('Older').click();
    expect(failedJobs.list).toHaveBeenLastCalledWith('file-scan', 2);

    fixture.componentInstance.reset();

    expect(failedJobs.list).toHaveBeenLastCalledWith(null, 1);
    expect(fixture.componentInstance.queue()).toBeNull();
    expect(fixture.componentInstance.pageNumber()).toBe(1);
  });

  it('lists each job with its queue, IDs, attempts and reason', async () => {
    failedJobs.list.mockReturnValue(
      of(
        pageOf([
          jobOf(),
          jobOf({
            queue: 'chat-transcript',
            jobId: '42',
            failedAt: null,
            subjectKind: 'CHAT_TRANSCRIPT',
            subjectId: 'transcript-1',
            reason: 'STALLED',
            retryable: false,
            notRetryableBecause: 'SETTLED',
          }),
          jobOf({
            queue: 'mystery-queue' as FailedJobQueue,
            jobId: '7',
            subjectKind: 'SOMETHING',
            subjectId: 'thing-1',
            retryable: false,
            notRetryableBecause: 'NEW_CODE',
          }),
          jobOf({
            queue: 'fleet-roster-replay',
            jobId: '8',
            subjectKind: null,
            subjectId: null,
            retryable: false,
            notRetryableBecause: null,
          }),
          jobOf({
            queue: 'file-scan',
            jobId: '9',
            subjectKind: null,
            subjectId: 'asset-9',
            retryable: false,
            notRetryableBecause: 'NO_SUBJECT',
          }),
        ]),
      ),
    );
    await show();

    expect(cells(0)).toEqual([
      'Sep 30, 2026, 10:00:00 AM',
      'Publishing scanned uploads',
      'asset-1',
      '5',
      'Asset 1b4e28ba-2fa1-11d2-883f-0016d3cca427',
      'ECONNREFUSED',
      'Retry Discard',
    ]);
    expect(cells(1)).toEqual([
      '—',
      'Chat transcripts',
      '42',
      '5',
      'Chat transcript transcript-1',
      'STALLED What it was for has moved on, so a retry would do nothing.',
      'Discard',
    ]);
    expect(cells(2)[1]).toBe('mystery-queue');
    expect(cells(2)[4]).toBe('SOMETHING thing-1');
    expect(cells(2)[5]).toBe('ECONNREFUSED A retry would do nothing.');
    expect(cells(3)[4]).toBe('—');
    expect(cells(3)[5]).toBe('ECONNREFUSED A retry would do nothing.');
    expect(cells(4)[4]).toBe('asset-9');
    expect(cells(4)[5]).toBe(
      'ECONNREFUSED It names nothing to act on, so a retry would do nothing.',
    );
    expect(buttons('Retry')).toHaveLength(1);
    expect(buttons('Discard')).toHaveLength(5);
  });

  it('counts each queue in the choice, and narrows the list to one', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    await show();

    expect(
      [...select().options].map(option =>
        option.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual([
      'Every queue',
      'Scan requests · 0',
      'Scan verdicts · 0',
      'Publishing scanned uploads · 1',
      'Chat transcripts · 0',
      'Roster replays · unknown',
    ]);

    failedJobs.list.mockReturnValue(
      of(pageOf([], { counts: { 'file-scan': 0 } })),
    );
    choose('file-scan');
    await fixture.whenStable();

    expect(failedJobs.list).toHaveBeenLastCalledWith('file-scan', 1);
    expect(select().value).toBe('file-scan');
    expect(words(select().options[1])).toBe('Scan requests · 0');
    expect(words(select().options[2])).toBe('Scan verdicts');

    choose('');
    expect(failedJobs.list).toHaveBeenLastCalledWith(null, 1);
  });

  it('turns the pages', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()], { total: 60 })));
    await show();

    expect(text()).toContain('Page 1 of 3');
    expect(button('Newer').disabled).toBe(true);

    button('Older').click();
    expect(failedJobs.list).toHaveBeenLastCalledWith(null, 2);

    button('Newer').click();
    expect(failedJobs.list).toHaveBeenLastCalledWith(null, 1);
  });

  it('retries one job with a reason, and reads the list again', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    await show();

    button('Retry').click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalledWith(
      GovernanceReasonDialogComponent,
      expect.objectContaining({
        data: {
          title: 'Retry the job',
          message: 'It is sent round again, with its attempts back.',
          label: 'Reason',
          confirmText: 'Retry',
          max: ADMIN_REASON_MAX_LENGTH,
        },
      }),
    );
    expect(failedJobs.retry).toHaveBeenCalledWith(
      'file-asset-publication',
      'asset-1',
      'Because',
    );
    expect(text()).toContain('Retried.');
    expect(failedJobs.list).toHaveBeenCalledTimes(2);
  });

  it('discards one job, saying when a retry could still help it', async () => {
    failedJobs.list.mockReturnValue(
      of(pageOf([jobOf(), jobOf({ jobId: 'asset-2', retryable: false })])),
    );
    await show();

    buttons('Discard')[0].click();
    await fixture.whenStable();

    expect(dialogData()).toEqual(
      expect.objectContaining({
        title: 'Discard the job',
        message:
          'It is removed from its queue and never runs again. A retry ' +
          'could still help this one.',
      }),
    );
    expect(failedJobs.discard).toHaveBeenCalledWith(
      'file-asset-publication',
      'asset-1',
      'Because',
    );
    expect(text()).toContain('Discarded.');

    buttons('Discard')[1].click();

    expect(dialogData()).toEqual(
      expect.objectContaining({
        message: 'It is removed from its queue and never runs again.',
      }),
    );
  });

  it('retries all in every queue, and says what it came to', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    await show();

    button('Retry all').click();
    await fixture.whenStable();

    expect(dialogData()).toEqual(
      expect.objectContaining({
        title: 'Retry all',
        message:
          'Every failed job in every queue that a retry can help is sent ' +
          'round again, up to 500 at a press. The rest are left alone.',
        confirmText: 'Retry all',
      }),
    );
    expect(failedJobs.retryAll).toHaveBeenCalledWith(null, 'Because');
    expect(text()).toContain('Retried 2 jobs; left 1 that a retry can’t help.');
  });

  it('discards all that cannot be retried in the queue chosen', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    await show();
    choose('file-asset-publication');
    await fixture.whenStable();

    button('Discard all that can’t be retried').click();
    await fixture.whenStable();

    expect(dialogData()).toEqual(
      expect.objectContaining({
        title: 'Discard all that can’t be retried',
        message:
          'Every failed job in Publishing scanned uploads that a retry ' +
          'can’t help is removed, up to 500 at a press. Those a retry ' +
          'could still help are kept.',
        confirmText: 'Discard them',
      }),
    );
    expect(failedJobs.discardUnretryable).toHaveBeenCalledWith(
      'file-asset-publication',
      'Because',
    );
    expect(text()).toContain(
      'Discarded 1 job; kept 2 that a retry could still help.',
    );
  });

  it('shows the server’s reason when it refuses, and reads the list again', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    failedJobs.retry.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message:
                'That job could not be retried; somebody may have retried it already.',
            },
          }),
      ),
    );
    await show();

    button('Retry').click();
    await fixture.whenStable();

    expect(text()).toContain(
      'That job could not be retried; somebody may have retried it already.',
    );
    expect(failedJobs.list).toHaveBeenCalledTimes(2);
  });

  it('says so in its own words when the server gives no reason', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    failedJobs.discard.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503, error: null })),
    );
    failedJobs.retryAll.mockReturnValue(throwError(() => new Error('offline')));
    await show();

    button('Discard').click();
    await fixture.whenStable();
    expect(text()).toContain(FAILED_JOB_ACTION_ERROR);

    button('Retry all').click();
    await fixture.whenStable();
    expect(text()).toContain(FAILED_JOB_ACTION_ERROR);
  });

  it('does nothing when the dialog is cancelled', async () => {
    failedJobs.list.mockReturnValue(of(pageOf([jobOf()])));
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    await show();

    button('Retry').click();
    button('Discard').click();
    button('Retry all').click();
    button('Discard all that can’t be retried').click();

    expect(failedJobs.retry).not.toHaveBeenCalled();
    expect(failedJobs.discard).not.toHaveBeenCalled();
    expect(failedJobs.retryAll).not.toHaveBeenCalled();
    expect(failedJobs.discardUnretryable).not.toHaveBeenCalled();
  });
});
