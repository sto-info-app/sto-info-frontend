import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
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
  ScanAssetDetail,
  ScanDiagnostics,
  ScanRejectionPage,
  ScanUsageWindow,
  ScanUsageWindowName,
} from 'src/app/models/scan-diagnostics.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { ScanDiagnosticsService } from 'src/app/shared/services/scan-diagnostics.service';

import { ImageEstatePanelComponent } from './image-estate-panel/image-estate-panel.component';
import { RescanPanelComponent } from './rescan-panel/rescan-panel.component';

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

/** An asset ID, as the server will look one up. */
const ASSET_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the list of refused assets is showing (FC-039). */
export type ScanRejectionsState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly page: ScanRejectionPage };

/** What looking one asset up came to (FC-039). */
export type ScanAssetLookup =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'FOUND'; readonly asset: ScanAssetDetail }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'INVALID' }
  | { readonly kind: 'ERROR' };

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
    ImageEstatePanelComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
    RescanPanelComponent,
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
  readonly rejections = signal<ScanRejectionsState>({ kind: 'LOADING' });
  readonly rejectionPage = signal(1);
  readonly lookup = signal<ScanAssetLookup>({ kind: 'NONE' });

  /**
   * Reads the diagnostics and the refused assets on arrival.
   */
  ngOnInit(): void {
    this.load();
    this.loadRejections();
  }

  /**
   * How many pages of refused assets there are.
   *
   * @param page - A page of them.
   * @returns The count, at least one.
   */
  pageCountOf(page: ScanRejectionPage): number {
    return Math.max(1, Math.ceil(page.total / page.pageSize));
  }

  /**
   * Moves to another page of refused assets.
   *
   * @param step - One back or one on.
   */
  turnRejections(step: -1 | 1): void {
    this.rejectionPage.update(page => page + step);
    this.loadRejections();
  }

  /**
   * Looks one asset up by its ID (FC-039).
   *
   * @param value - The ID, as typed.
   */
  lookUp(value: string): void {
    const assetId = value.trim();

    if (!ASSET_ID.test(assetId)) {
      this.lookup.set({ kind: 'INVALID' });
      return;
    }

    this.lookup.set({ kind: 'LOADING' });
    this._diagnosticsService
      .asset(assetId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: asset => this.lookup.set({ kind: 'FOUND', asset }),
        error: (error: unknown) =>
          this.lookup.set({
            kind:
              error instanceof HttpErrorResponse &&
              error.status === HttpStatusCode.NotFound
                ? 'NOT_FOUND'
                : 'ERROR',
          }),
      });
  }

  /** Reads the page of refused assets asked for. */
  private loadRejections(): void {
    this.rejections.set({ kind: 'LOADING' });
    this._diagnosticsService
      .rejections(this.rejectionPage())
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => this.rejections.set({ kind: 'READY', page }),
        error: () => this.rejections.set({ kind: 'ERROR' }),
      });
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
