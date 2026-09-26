import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  ScanDiagnostics,
  ScanUsageWindow,
} from 'src/app/models/scan-diagnostics.models';
import { ScanDiagnosticsService } from 'src/app/shared/services/scan-diagnostics.service';
import {
  SCAN_DIAGNOSTICS_ERROR,
  ScanDiagnosticsComponent,
  formatDuration,
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
};

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

describe('ScanDiagnosticsComponent', () => {
  let fixture: ComponentFixture<ScanDiagnosticsComponent>;
  let read: jest.Mock;

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
  const render = async (answer: unknown): Promise<void> => {
    read = jest.fn().mockReturnValue(answer);

    await TestBed.configureTestingModule({
      imports: [ScanDiagnosticsComponent],
      providers: [
        provideRouter([]),
        { provide: ScanDiagnosticsService, useValue: { read } },
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
});
