import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import {
  ScanDiagnostics,
  ScanUsageWindow,
  ScanUsageWindowName,
} from 'src/app/models/scan-diagnostics.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { ScanDiagnosticsService } from 'src/app/shared/services/scan-diagnostics.service';

/** What to say when the diagnostics could not be read at all. */
export const SCAN_DIAGNOSTICS_ERROR =
  'The scan diagnostics could not be read. Please try again.';

/** The column headings, in the order the server sends the windows. */
export const SCAN_WINDOW_LABELS: Readonly<Record<ScanUsageWindowName, string>> =
  {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
  };

/** A count the usage tables show, and what to call it. */
interface CountRow {
  readonly key: keyof ScanUsageWindow;
  readonly label: string;
}

/** A duration the latency table shows, and what to call it. */
interface DurationRow {
  readonly key: keyof ScanUsageWindow;
  readonly label: string;
}

/** What the worker was asked to do, and how often it had to try. */
export const SCAN_ACTIVITY_ROWS: readonly CountRow[] = [
  { key: 'initialScans', label: 'Initial scans' },
  { key: 'rescans', label: 'Re-scans' },
  { key: 'retriedScans', label: 'Scans that needed a retry' },
  { key: 'retries', label: 'Retries' },
  { key: 'inProgress', label: 'In progress' },
];

/** What the worker concluded. */
export const SCAN_OUTCOME_ROWS: readonly CountRow[] = [
  { key: 'clean', label: 'Clean' },
  { key: 'infected', label: 'Infected' },
  { key: 'unsupported', label: 'Could not be opened' },
  { key: 'contentTypeMismatch', label: 'Not the type declared' },
  { key: 'tooLarge', label: 'Too large' },
  { key: 'hashMismatch', label: 'Changed since upload' },
  { key: 'objectMissing', label: 'Missing from quarantine' },
  { key: 'retriesExhausted', label: 'Refused after every retry' },
  { key: 'failed', label: 'Failed without a verdict' },
];

/** How long scans took, and how long uploads waited for an answer. */
export const SCAN_LATENCY_ROWS: readonly DurationRow[] = [
  { key: 'scanMedianMs', label: 'Scan time, median' },
  { key: 'scanP95Ms', label: 'Scan time, 95th percentile' },
  { key: 'scanMaxMs', label: 'Scan time, longest' },
  { key: 'waitMedianMs', label: 'Wait for a verdict, median' },
  { key: 'waitP95Ms', label: 'Wait for a verdict, 95th percentile' },
  { key: 'waitMaxMs', label: 'Wait for a verdict, longest' },
];

/** What the page is showing. */
export type ScanDiagnosticsState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly diagnostics: ScanDiagnostics };

/**
 * Writes a duration the way a reader takes it in at a glance.
 *
 * @param ms - The duration in milliseconds, or null when there is none.
 * @returns The duration, or a dash.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '—';
  }

  if (ms < 1000) {
    return `${ms} ms`;
  }

  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)} s`;
  }

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);

  return `${minutes} min ${seconds} s`;
}

/**
 * What the file scan worker has done, what it is running on, and what is
 * waiting for it (FC-003).
 *
 * For administrators only. Every figure is a total: the server reads the
 * worker's own views, which cannot name a file, an uploader or a signature.
 * A part the server could not reach is said to be unavailable, and the rest
 * of the page still shows.
 */
@Component({
  selector: 'app-scan-diagnostics',
  templateUrl: './scan-diagnostics.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './scan-diagnostics.component.scss',
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
    RouterModule,
  ],
})
export class ScanDiagnosticsComponent implements OnInit {
  private readonly _diagnosticsService = inject(ScanDiagnosticsService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly adminLink = '/' + APP_ROUTES.ADMIN;
  readonly errorMessage = SCAN_DIAGNOSTICS_ERROR;
  readonly windowLabels = SCAN_WINDOW_LABELS;
  readonly activityRows = SCAN_ACTIVITY_ROWS;
  readonly outcomeRows = SCAN_OUTCOME_ROWS;
  readonly latencyRows = SCAN_LATENCY_ROWS;

  readonly state = signal<ScanDiagnosticsState>({ kind: 'LOADING' });

  /**
   * Reads the diagnostics on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads the diagnostics, afresh.
   */
  load(): void {
    this.state.set({ kind: 'LOADING' });

    this._diagnosticsService
      .read()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: diagnostics => this.state.set({ kind: 'READY', diagnostics }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * Reads one count from a window.
   *
   * @param window - The window.
   * @param key - The count.
   * @returns The count.
   */
  countOf(window: ScanUsageWindow, key: keyof ScanUsageWindow): number {
    return window[key] as number;
  }

  /**
   * Reads one duration from a window, written for a reader.
   *
   * @param window - The window.
   * @param key - The duration.
   * @returns The duration, or a dash when the window has none.
   */
  durationOf(window: ScanUsageWindow, key: keyof ScanUsageWindow): string {
    return formatDuration(window[key] as number | null);
  }
}
