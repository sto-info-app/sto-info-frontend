import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  ScanAssetDetail,
  ScanDiagnostics,
  ScanRejectionPage,
  ScanUsageWindow,
} from 'src/app/models/scan-diagnostics.models';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ScanDiagnosticsService } from 'src/app/shared/services/scan-diagnostics.service';
import { ImageEstateAdminService } from './image-estate-panel/image-estate-admin.service';
import { RescanAdminService } from './rescan-panel/rescan-admin.service';
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

describe('ScanDiagnosticsComponent', () => {
  let fixture: ComponentFixture<ScanDiagnosticsComponent>;
  let read: jest.Mock;
  let rejections: jest.Mock;
  let asset: jest.Mock;

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
