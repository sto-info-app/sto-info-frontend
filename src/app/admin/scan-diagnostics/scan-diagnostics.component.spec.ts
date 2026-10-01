import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  OperationsAlert,
  OperationsAlertKind,
  ScanAssetDetail,
  ScanDiagnostics,
  ScanRejectionPage,
  ScanUsageWindow,
  ScanWorkerHeartbeat,
} from 'src/app/models/scan-diagnostics.models';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ScanDiagnosticsService } from 'src/app/shared/services/scan-diagnostics.service';
import { FailedJobsAdminService } from './failed-jobs-panel/failed-jobs-admin.service';
import { ImageEstateAdminService } from './image-estate-panel/image-estate-admin.service';
import { RescanAdminService } from './rescan-panel/rescan-admin.service';
import {
  OPERATIONS_ALERT_TITLES,
  SCAN_DIAGNOSTICS_ERROR,
  ScanDiagnosticsComponent,
  WORKER_PAUSE_REASON_LABELS,
  WORKER_PAUSED_WITHOUT_REASON,
  alertDetailOf,
  formatDuration,
  formatSecondsAgo,
  summariseWorkers,
  workerStateOf,
} from './scan-diagnostics.component';

/**
 * Builds one window of usage.
 *
 * @param window - The window.
 * @param initialScans - How many initial scans it holds, to tell windows apart.
 * @returns The window.
 */
function usage(
  window: ScanUsageWindow['window'],
  initialScans: number,
): ScanUsageWindow {
  return {
    window,
    initialScans,
    rescans: 1,
    retriedScans: 1,
    retries: 2,
    clean: 2,
    infected: 1,
    unsupported: 0,
    contentTypeMismatch: 0,
    tooLarge: 0,
    hashMismatch: 0,
    objectMissing: 0,
    retriesExhausted: 0,
    failed: 0,
    inProgress: 1,
    scanMedianMs: 2000,
    scanP95Ms: 3800,
    scanMaxMs: 4000,
    waitMedianMs: 450,
    waitP95Ms: 125_000,
    waitMaxMs: null,
  };
}

/**
 * A worker process's heartbeat (FC-042).
 *
 * @param overrides - What differs.
 * @returns The heartbeat.
 */
const workerOf = (
  overrides: Partial<ScanWorkerHeartbeat> = {},
): ScanWorkerHeartbeat => ({
  workerId: 'worker-a',
  state: 'RUNNING',
  pauseReason: null,
  definitionsVersion: '27501',
  definitionsBuiltAt: '2026-09-26T08:39:00.000Z',
  signatureAgeHours: 3.4,
  jobsInHand: 2,
  startedAt: '2026-09-26T08:00:00.000Z',
  beatAt: '2026-09-26T11:59:48.000Z',
  secondsSinceBeat: 12,
  live: true,
  pausedSince: null,
  pausedMinutes: null,
  ...overrides,
});

/**
 * An open alert (FC-042).
 *
 * @param kind - Which.
 * @param detail - Its counts.
 * @returns The alert.
 */
const alertOf = (
  kind: string,
  detail: Record<string, number> = {},
): OperationsAlert => ({
  kind: kind as OperationsAlertKind,
  openedAt: '2026-09-26T11:00:00.000Z',
  lastSeenAt: '2026-09-26T11:59:00.000Z',
  detail,
});

const DIAGNOSTICS: ScanDiagnostics = {
  generatedAt: '2026-09-26T12:00:00.000Z',
  usage: [usage('24h', 3), usage('7d', 4), usage('30d', 5)],
  engine: {
    engine: 'clamav',
    engineVersion: '1.4.3',
    signatureVersion: '27500',
    definitionsBuiltAt: '2026-09-26T08:39:00.000Z',
    signatureAgeHours: 3.4,
    reportedAt: '2026-09-26T11:55:00.000Z',
  },
  queue: { waiting: 3, delayed: 4, active: 1, failed: 0 },
  awaiting: { quarantined: 0, scanning: 3, retryPending: 1 },
  workers: [workerOf()],
  alerts: [],
  publication: {
    paused: false,
    pausedAt: null,
    pausedByUserId: null,
    pausedByUsername: null,
    queuePaused: false,
    held: 0,
  },
  owedPurges: { owed: 0, overdue: 0, oldestHours: null },
};

/** A refused asset (FC-039). */
const REFUSED: ScanAssetDetail = {
  id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  kind: 'PROFILE_IMAGE',
  state: 'REJECTED',
  rejectionCode: 'MALWARE_DETECTED',
  scanEngine: 'clamav',
  scanEngineVersion: '1.4.3',
  scanSignatureVersion: '27500',
  policyVersion: 3,
  createdAt: '2026-09-26T10:00:00.000Z',
  lastVerdictAt: '2026-09-26T10:01:00.000Z',
};

/**
 * A page of refused assets.
 *
 * @param items - Its assets.
 * @param total - How many there are.
 * @returns The page.
 */
const refusedPage = (
  items: ScanAssetDetail[],
  total = items.length,
): ScanRejectionPage => ({ items, total, page: 1, pageSize: 25 });

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [0, '0 ms'],
    [999, '999 ms'],
    [1000, '1.0 s'],
    [3800, '3.8 s'],
    [59_949, '59.9 s'],
    [60_000, '1 min 0 s'],
    [125_400, '2 min 5 s'],
  ])('writes %p as %p', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatSecondsAgo (FC-042)', () => {
  it.each([
    [0, 'just now'],
    [-3, 'just now'],
    [1, '1 second ago'],
    [12.7, '12 seconds ago'],
    [60, '1 minute ago'],
    [3599, '59 minutes ago'],
    [3600, '1 hour ago'],
    [86_399, '23 hours ago'],
    [86_400, '1 day ago'],
    [172_800, '2 days ago'],
  ])('writes %p seconds as %p', (seconds, expected) => {
    expect(formatSecondsAgo(seconds)).toBe(expected);
  });
});

describe('workerStateOf (FC-042)', () => {
  it('says running and stopping in words', () => {
    expect(workerStateOf(workerOf())).toBe('Running');
    expect(workerStateOf(workerOf({ state: 'STOPPING' }))).toBe('Stopping');
  });

  it.each(Object.entries(WORKER_PAUSE_REASON_LABELS))(
    'says why a worker paused for %s',
    (pauseReason, label) => {
      expect(workerStateOf(workerOf({ state: 'PAUSED', pauseReason }))).toBe(
        label,
      );
    },
  );

  it('names the scanner and the signatures as the brief asks', () => {
    expect(WORKER_PAUSE_REASON_LABELS['SCANNER_UNREACHABLE']).toBe(
      'Paused — the scanner can’t be reached',
    );
    expect(WORKER_PAUSE_REASON_LABELS['SIGNATURES_TOO_OLD']).toBe(
      'Paused — signatures too old',
    );
  });

  it('says a worker paused with no reason has not resumed', () => {
    expect(workerStateOf(workerOf({ state: 'PAUSED' }))).toBe(
      WORKER_PAUSED_WITHOUT_REASON,
    );
  });

  it('falls back to the code in words for a reason or state it does not know', () => {
    expect(
      workerStateOf(workerOf({ state: 'PAUSED', pauseReason: 'DISK_FULL' })),
    ).toBe('Paused — Disk full');
    expect(
      workerStateOf(
        workerOf({ state: 'DRAINING' as ScanWorkerHeartbeat['state'] }),
      ),
    ).toBe('Draining');
  });
});

describe('summariseWorkers (FC-042)', () => {
  it('shows the live ones and counts the rest', () => {
    const live = workerOf();
    const gone = workerOf({
      workerId: 'worker-b',
      live: false,
      secondsSinceBeat: 900,
    });

    expect(summariseWorkers([live, gone])).toEqual({
      live: [live],
      gone: 1,
      quietMinutes: null,
    });
  });

  it('says how long since any beat when none is live', () => {
    expect(
      summariseWorkers([
        workerOf({ live: false, secondsSinceBeat: 1000 }),
        workerOf({ live: false, secondsSinceBeat: 330 }),
      ]),
    ).toEqual({ live: [], gone: 2, quietMinutes: 5 });
  });

  it('says nothing of minutes when no process beat in the last day', () => {
    expect(summariseWorkers([])).toEqual({
      live: [],
      gone: 0,
      quietMinutes: null,
    });
  });
});

describe('alertDetailOf (FC-042)', () => {
  it.each([
    [
      'SCAN_QUEUE_LAG',
      { oldestMinutes: 23 },
      'The oldest has waited 23 minutes.',
    ],
    [
      'PUBLICATION_QUEUE_LAG',
      { oldestMinutes: 1 },
      'The oldest has waited 1 minute.',
    ],
    [
      'WORKER_SILENT',
      { liveWorkers: 0, minutesSinceBeat: 4 },
      'None has checked in for 4 minutes.',
    ],
    [
      'WORKER_SILENT',
      { liveWorkers: 0 },
      'None has checked in during the last day.',
    ],
    ['WORKER_SILENT', {}, 'The workers’ heartbeat could not be read.'],
    [
      'WORKER_PAUSED',
      { pausedWorkers: 2, pausedMinutes: 11 },
      '2 workers paused, the latest for 11 minutes.',
    ],
    [
      'SIGNATURES_STALE',
      { signatureAgeHours: 37.5 },
      'The newest are 37.5 hours old; the worker stops scanning at 48.',
    ],
    ['FAILED_JOBS', { failed: 1 }, '1 failed job, listed under Failed jobs.'],
    ['FAILED_JOBS', { failed: 3 }, '3 failed jobs, listed under Failed jobs.'],
    [
      'PUBLICATION_PAUSED_LONG',
      { pausedMinutes: 75 },
      'Paused for 75 minutes.',
    ],
    ['QUEUES_UNREACHABLE', { minutesUnreachable: 3 }, 'For 3 minutes.'],
    [
      'PURGE_OWED',
      { overdue: 2, oldestHours: 30 },
      '2 pictures owed for over a day; the oldest for 30 hours.',
    ],
    [
      'PURGE_OWED',
      { overdue: 1, oldestHours: 25 },
      '1 picture owed for over a day; the oldest for 25 hours.',
    ],
  ])('says what %s with %p means', (kind, detail, expected) => {
    expect(alertDetailOf(alertOf(kind, detail))).toBe(expected);
  });

  it.each([
    ['SCAN_QUEUE_LAG'],
    ['PUBLICATION_QUEUE_LAG'],
    ['SIGNATURES_STALE'],
    ['FAILED_JOBS'],
    ['PUBLICATION_PAUSED_LONG'],
    ['QUEUES_UNREACHABLE'],
    ['PURGE_OWED'],
    ['SOMETHING_NEW'],
  ])('says nothing more of %s without its counts', kind => {
    expect(alertDetailOf(alertOf(kind))).toBeNull();
  });

  it('says nothing more of a paused worker missing either count', () => {
    expect(
      alertDetailOf(alertOf('WORKER_PAUSED', { pausedWorkers: 1 })),
    ).toBeNull();
    expect(
      alertDetailOf(alertOf('WORKER_PAUSED', { pausedMinutes: 12 })),
    ).toBeNull();
  });
});

describe('ScanDiagnosticsComponent', () => {
  let fixture: ComponentFixture<ScanDiagnosticsComponent>;
  let read: jest.Mock;
  let rejections: jest.Mock;
  let asset: jest.Mock;
  let failedJobs: { list: jest.Mock };

  /** The page, as a reader sees it. */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /**
   * The text of every element matching a selector.
   *
   * @param selector - The selector.
   * @returns Their trimmed text, in document order.
   */
  const textsOf = (selector: string): string[] =>
    Array.from(page().querySelectorAll(selector)).map(
      element => element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

  /**
   * The cells of a table's body row, heading first.
   *
   * @param caption - The table's caption.
   * @param heading - The row's heading.
   * @returns The heading and each cell's text.
   */
  const rowOf = (caption: string, heading: string): string[] => {
    const table = Array.from(page().querySelectorAll('table')).find(
      candidate => candidate.caption?.textContent?.trim() === caption,
    );
    const row = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
      candidate =>
        candidate.querySelector('th')?.textContent?.trim() === heading,
    );

    return Array.from(row?.querySelectorAll('th, td') ?? []).map(
      cell => cell.textContent?.trim() ?? '',
    );
  };

  /**
   * Renders the page with the service answering as given.
   *
   * @param answer - What the service returns.
   */
  const render = async (
    answer: unknown,
    refused: unknown = of(refusedPage([])),
  ): Promise<void> => {
    read = jest.fn().mockReturnValue(answer);
    rejections = jest.fn().mockReturnValue(refused);
    asset = jest.fn().mockReturnValue(of(REFUSED));
    failedJobs = { list: jest.fn(() => new Subject()) };

    await TestBed.configureTestingModule({
      imports: [ScanDiagnosticsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ScanDiagnosticsService,
          useValue: { read, rejections, asset },
        },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
        // The private delivery and rescan panels read on their own; their
        // specs cover them.
        {
          provide: ImageEstateAdminService,
          useValue: { status: () => new Subject() },
        },
        {
          provide: RescanAdminService,
          useValue: { overview: () => new Subject() },
        },
        // The failed jobs panel's own spec covers what it shows; here only
        // that Refresh reads it again (FC-042).
        { provide: FailedJobsAdminService, useValue: failedJobs },
        { provide: AuthService, useValue: { getUserId: () => 'admin-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScanDiagnosticsComponent);
    fixture.detectChanges();
  };

  describe('while reading', () => {
    it('shows the loading bar and nothing else yet', async () => {
      await render(new Subject<ScanDiagnostics>());

      expect(page().querySelector('app-loading-bar')).not.toBeNull();
      expect(page().querySelector('table')).toBeNull();
    });
  });

  describe('when the diagnostics cannot be read', () => {
    beforeEach(() => render(throwError(() => new Error('down'))));

    it('says so', () => {
      expect(page().querySelector('app-lcars-error-message')).not.toBeNull();
      expect(fixture.componentInstance.errorMessage).toBe(
        SCAN_DIAGNOSTICS_ERROR,
      );
    });

    it('reads again when asked', () => {
      read.mockReturnValue(of(DIAGNOSTICS));

      (page().querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(read).toHaveBeenCalledTimes(2);
      expect(page().querySelectorAll('table')).toHaveLength(3);
    });
  });

  describe('with every part available', () => {
    beforeEach(() => render(of(DIAGNOSTICS)));

    it('heads each table with the three windows', () => {
      expect(textsOf('table:first-of-type thead th')).toEqual([
        'Measure',
        'Last 24 hours',
        'Last 7 days',
        'Last 30 days',
      ]);
    });

    it('shows each count under its window', () => {
      expect(rowOf('Scans', 'Initial scans')).toEqual([
        'Initial scans',
        '3',
        '4',
        '5',
      ]);
      expect(rowOf('Outcomes', 'Infected')).toEqual([
        'Infected',
        '1',
        '1',
        '1',
      ]);
    });

    it('writes each duration for a reader, and a dash where there is none', () => {
      expect(rowOf('Latency', 'Scan time, 95th percentile')).toEqual([
        'Scan time, 95th percentile',
        '3.8 s',
        '3.8 s',
        '3.8 s',
      ]);
      expect(rowOf('Latency', 'Wait for a verdict, median')[1]).toBe('450 ms');
      expect(rowOf('Latency', 'Wait for a verdict, longest')[1]).toBe('—');
    });

    it('labels every figure with its window, for the narrow layout', () => {
      const labels = Array.from(page().querySelectorAll('tbody td')).map(cell =>
        cell.getAttribute('data-label'),
      );

      expect(labels).not.toContain(null);
      expect(new Set(labels)).toEqual(
        new Set(['Last 24 hours', 'Last 7 days', 'Last 30 days']),
      );
    });

    it('shows the engine and how old its signatures are', () => {
      const details = textsOf('dd');

      expect(details).toContain('clamav 1.4.3');
      expect(details).toContain('27500');
      expect(details).toContain('3.4 hours');
    });

    it('shows the queue and the assets awaiting a verdict', () => {
      const details = textsOf('dd');

      expect(details).toEqual(expect.arrayContaining(['3', '4', '1', '0']));
      expect(page().textContent).toContain('Waiting to be picked up');
      expect(page().textContent).toContain('Sent to scan, no verdict yet');
    });

    it('reads again on Refresh', () => {
      const refresh = Array.from(page().querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'Refresh',
      ) as HTMLButtonElement;

      refresh.click();
      fixture.detectChanges();

      expect(read).toHaveBeenCalledTimes(2);
      expect(failedJobs.list).toHaveBeenCalledTimes(2);
    });

    it('says nothing needs a site admin while no alert is open (FC-042)', () => {
      expect(page().textContent).toContain('Nothing needs a site admin.');
    });

    it('shows each live worker with its state and heartbeat (FC-042)', () => {
      expect(textsOf('.scan-diagnostics__worker-state')).toEqual(['Running']);
      expect(textsOf('.scan-diagnostics__workers dd')).toEqual([
        'worker-a',
        '27501',
        '3.4 hours',
        '2',
        '12 seconds ago',
      ]);
    });

    it('says publication is running, and where it is switched (FC-042)', () => {
      expect(page().textContent).toContain('Publication is running.');
      expect(
        page()
          .querySelector('a[href="/admin"]')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim(),
      ).toBe('Pause or resume publication on the Admin page');
    });
  });

  // FC-042: what needs a site admin, the worker processes and the pause.
  describe('operations', () => {
    const text = (): string => page().textContent?.replace(/\s+/g, ' ') ?? '';

    it('lists the open alerts in words, with when each opened', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          alerts: [
            alertOf('FAILED_JOBS', { failed: 2 }),
            alertOf('WORKER_PAUSED'),
            alertOf('SOMETHING_NEW'),
          ],
        } satisfies ScanDiagnostics),
      );

      const alerts = textsOf('.scan-diagnostics__alerts li');

      expect(alerts).toHaveLength(3);
      expect(alerts[0]).toContain(OPERATIONS_ALERT_TITLES['FAILED_JOBS']);
      expect(alerts[0]).toContain('2 failed jobs, listed under Failed jobs.');
      expect(alerts[0]).toContain('Opened Sep 26, 2026, 11:00:00 AM');
      expect(alerts[0]).toContain('last seen Sep 26, 2026, 11:59:00 AM');
      expect(alerts[1]).toContain('The scan worker is paused');
      expect(
        page().querySelectorAll('.scan-diagnostics__alert-detail'),
      ).toHaveLength(1);
      expect(alerts[2]).toContain('Something new');
    });

    it('says when the heartbeat cannot be read', async () => {
      await render(of({ ...DIAGNOSTICS, workers: null }));

      expect(text()).toContain('The worker’s heartbeat could not be read.');
    });

    it('says no worker is running when none beat in the last day', async () => {
      await render(of({ ...DIAGNOSTICS, workers: [] }));

      expect(text()).toContain(
        'No worker is running: none has checked in during the last day.',
      );
    });

    it('says how long since any worker checked in when none is live', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          workers: [workerOf({ live: false, secondsSinceBeat: 420 })],
        }),
      );

      expect(text()).toContain('No worker has checked in for 7 minutes.');
      expect(page().querySelector('.scan-diagnostics__workers')).toBeNull();

      TestBed.resetTestingModule();
      await render(
        of({
          ...DIAGNOSTICS,
          workers: [workerOf({ live: false, secondsSinceBeat: 60 })],
        }),
      );
      expect(text()).toContain('No worker has checked in for 1 minute.');
    });

    it('shows a paused worker, since when, and says what is not shown', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          workers: [
            workerOf({
              state: 'PAUSED',
              pauseReason: 'SIGNATURES_TOO_OLD',
              definitionsVersion: null,
              signatureAgeHours: null,
              pausedSince: '2026-09-26T11:40:00.000Z',
              pausedMinutes: 20,
            }),
            workerOf({ workerId: 'worker-b', live: false }),
          ],
        }),
      );

      expect(textsOf('.scan-diagnostics__worker-state')).toEqual([
        'Paused — signatures too old',
      ]);
      expect(textsOf('.scan-diagnostics__workers dd')).toEqual(
        expect.arrayContaining([
          'Not reported',
          'Unknown',
          'Sep 26, 2026, 11:40:00 AM',
        ]),
      );
      expect(text()).toContain(
        'Not shown: 1 earlier process that stopped checking in',
      );

      TestBed.resetTestingModule();
      await render(
        of({
          ...DIAGNOSTICS,
          workers: [
            workerOf(),
            workerOf({ workerId: 'worker-b', live: false }),
            workerOf({ workerId: 'worker-c', live: false }),
          ],
        }),
      );
      expect(text()).toContain('Not shown: 2 earlier processes that stopped');
    });

    it('says publication is paused, since when and by this site admin', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          publication: {
            paused: true,
            pausedAt: '2026-09-26T10:30:00.000Z',
            pausedByUserId: 'admin-1',
            pausedByUsername: 'Quark',
            queuePaused: true,
            held: 4,
          },
        }),
      );

      expect(text()).toContain('Publication is paused.');
      expect(textsOf('dd')).toEqual(
        expect.arrayContaining(['Sep 26, 2026, 10:30:00 AM', 'You', '4']),
      );
    });

    it('names another site admin, and says what it does not know while the queues are down', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          publication: {
            paused: true,
            pausedAt: null,
            pausedByUserId: 'admin-2',
            pausedByUsername: 'Rom',
            queuePaused: null,
            held: null,
          },
        }),
      );

      expect(textsOf('dd')).toEqual(expect.arrayContaining(['Unknown', 'Rom']));
      expect(text()).not.toContain('Waiting to be published');
      expect(text()).toContain(
        'The job queues can’t be reached just now; they will be paused as ' +
          'soon as they answer, and nothing is published meanwhile.',
      );

      TestBed.resetTestingModule();
      await render(
        of({
          ...DIAGNOSTICS,
          publication: {
            paused: true,
            pausedAt: null,
            pausedByUserId: 'admin-2',
            pausedByUsername: null,
            queuePaused: true,
            held: 0,
          },
        }),
      );
      expect(textsOf('dd')).toEqual(
        expect.arrayContaining(['Unknown', 'An account since closed']),
      );
      expect(text()).not.toContain('they will be paused');
    });

    it('says nothing is published while the queues are down and it runs', async () => {
      await render(
        of({
          ...DIAGNOSTICS,
          publication: { ...DIAGNOSTICS.publication, queuePaused: null },
        }),
      );

      expect(text()).toContain(
        'Publication is running. The job queues can’t be reached just now, ' +
          'so nothing is published until they answer.',
      );
    });

    // FC-043: a withdrawn picture is still online until Cloudflare deletes
    // it, and the page says so.
    it('says every withdrawn picture has been deleted', async () => {
      await render(of(DIAGNOSTICS));

      expect(text()).toContain(
        'Every withdrawn picture has been deleted from Cloudflare.',
      );
    });

    it.each([
      [1, '1 withdrawn picture still to be deleted from Cloudflare.'],
      [3, '3 withdrawn pictures still to be deleted from Cloudflare.'],
    ])('says how many withdrawn pictures are owed, %s', async (owed, words) => {
      await render(
        of({
          ...DIAGNOSTICS,
          owedPurges: { owed, overdue: 1, oldestHours: 27 },
        }),
      );

      expect(text()).toContain(words);
      expect(text()).toContain('The site asks Cloudflare again every hour.');
      expect(textsOf('dd')).toEqual(expect.arrayContaining(['1', '27 hours']));
    });

    it('reads the diagnostics alone on Try again', async () => {
      await render(throwError(() => new Error('down')));

      fixture.componentInstance.load();

      expect(failedJobs.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('with parts unavailable', () => {
    beforeEach(() =>
      render(
        of({
          ...DIAGNOSTICS,
          usage: null,
          engine: null,
          queue: null,
        } satisfies ScanDiagnostics),
      ),
    );

    it('says which parts could not be read and still shows the rest', () => {
      const notices = textsOf('.scan-diagnostics__unavailable');

      expect(notices).toEqual([
        'The worker’s usage figures could not be read. Its migrations may not have run here yet.',
        'No scan has reported an engine yet, or the worker’s figures could not be read.',
        'The scan queue could not be reached.',
      ]);
      expect(page().querySelector('table')).toBeNull();
      expect(page().textContent).toContain('Waiting to be sent again');
    });
  });

  describe('with an engine that did not report everything', () => {
    beforeEach(() =>
      render(
        of({
          ...DIAGNOSTICS,
          engine: {
            engine: 'clamav',
            engineVersion: null,
            signatureVersion: null,
            definitionsBuiltAt: null,
            signatureAgeHours: null,
            reportedAt: '2026-09-26T11:55:00.000Z',
          },
        } satisfies ScanDiagnostics),
      ),
    );

    it('says what was not reported rather than guessing', () => {
      const details = textsOf('dd');

      expect(details).toContain('clamav');
      expect(details).toContain('Not reported');
      expect(details).toContain('Unknown');
    });
  });

  // FC-039: why an upload was refused, and with what, for an admin.
  describe('refused uploads', () => {
    /**
     * Types an asset ID and looks it up.
     *
     * @param value - What is typed.
     */
    const lookUp = (value: string): void => {
      const input = page().querySelector('#scan-asset-id') as HTMLInputElement;

      input.value = value;
      page()
        .querySelector('.scan-diagnostics__lookup')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();
    };

    const text = (): string => page().textContent?.replace(/\s+/g, ' ') ?? '';

    it('lists them with their code and engine, a page at a time', async () => {
      await render(of(DIAGNOSTICS), of(refusedPage([REFUSED], 30)));

      expect(rejections).toHaveBeenCalledWith(1);
      expect(
        rowOf('Refused uploads, newest verdict first', '').length,
      ).toBeGreaterThanOrEqual(0);
      expect(text()).toContain('MALWARE_DETECTED');
      expect(text()).toContain('clamav 1.4.3');
      expect(text()).toContain('signatures 27500');
      expect(text()).toContain('Page 1 of 2');

      const older = Array.from(page().querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'Older',
      )!;

      older.click();
      fixture.detectChanges();
      expect(rejections).toHaveBeenLastCalledWith(2);

      Array.from(page().querySelectorAll('button'))
        .find(button => button.textContent?.trim() === 'Newer')!
        .click();
      expect(rejections).toHaveBeenLastCalledWith(1);
    });

    it('shows what it knows of one with no verdict or engine yet', async () => {
      await render(
        of(DIAGNOSTICS),
        of(
          refusedPage([
            {
              ...REFUSED,
              rejectionCode: null,
              scanEngine: null,
              scanEngineVersion: null,
              scanSignatureVersion: null,
              lastVerdictAt: null,
            },
          ]),
        ),
      );

      expect(text()).not.toContain('signatures');
      expect(text()).toContain('—');
    });

    it('says when nothing has been refused, or the list cannot be read', async () => {
      await render(of(DIAGNOSTICS));
      expect(text()).toContain('Nothing has been refused.');

      TestBed.resetTestingModule();
      await render(
        of(DIAGNOSTICS),
        throwError(() => new Error('down')),
      );
      expect(text()).toContain('The refused uploads could not be read.');

      TestBed.resetTestingModule();
      await render(of(DIAGNOSTICS), new Subject<ScanRejectionPage>());
      expect(text()).toContain('Loading the refused uploads');
    });

    it('looks one asset up by its ID', async () => {
      await render(of(DIAGNOSTICS));

      lookUp(`  ${REFUSED.id}  `);

      expect(asset).toHaveBeenCalledWith(REFUSED.id);
      expect(textsOf('.scan-diagnostics__asset dd')).toEqual(
        expect.arrayContaining([
          REFUSED.id,
          'PROFILE_IMAGE',
          'REJECTED',
          'MALWARE_DETECTED',
          'clamav 1.4.3',
          '27500',
          '3',
        ]),
      );
    });

    it('says what it knows of an asset with no verdict or engine', async () => {
      await render(of(DIAGNOSTICS));
      asset.mockReturnValue(
        of({
          ...REFUSED,
          state: 'QUARANTINED',
          rejectionCode: null,
          scanEngine: null,
          scanEngineVersion: null,
          scanSignatureVersion: null,
          lastVerdictAt: null,
        }),
      );

      lookUp(REFUSED.id);

      expect(textsOf('.scan-diagnostics__asset dd')).toEqual(
        expect.arrayContaining(['QUARANTINED', '—', 'None yet']),
      );
    });

    it('refuses what is not an ID without asking', async () => {
      await render(of(DIAGNOSTICS));

      lookUp('not-an-id');

      expect(asset).not.toHaveBeenCalled();
      expect(text()).toContain('That is not an asset ID.');
    });

    it('says when there is no such asset, or it cannot be looked up', async () => {
      await render(of(DIAGNOSTICS));

      asset.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );
      lookUp(REFUSED.id);
      expect(text()).toContain('No asset has that ID.');

      asset.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      lookUp(REFUSED.id);
      expect(text()).toContain('The asset could not be looked up.');

      asset.mockReturnValue(throwError(() => new Error('offline')));
      lookUp(REFUSED.id);
      expect(text()).toContain('The asset could not be looked up.');

      asset.mockReturnValue(new Subject<ScanAssetDetail>());
      lookUp(REFUSED.id);
      expect(text()).toContain('Looking it up');
    });
  });
});
