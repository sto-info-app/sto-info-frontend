import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

import { Observable, take } from 'rxjs';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  IMAGE_ESTATE_RUN_LABELS,
  IMAGE_ESTATE_STATE_LABELS,
  ImageEstateRunKind,
  ImageEstateRunState,
  ImageEstateStatus,
} from 'src/app/models/image-estate.models';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ImageEstateAdminService } from './image-estate-admin.service';

/** What the panel is showing. */
export type ImageEstatePanelState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly status: ImageEstateStatus };

/** What each run is, for the site admin deciding to start it. */
const RUN_MESSAGES: Readonly<Record<ImageEstateRunKind, string>> = {
  [ImageEstateRunKind.COPY]:
    'Copy every public picture to a private one, reachable only by a signed address, and point every record at the copy. Nothing is deleted, and it can be undone until the old copies are retired.',
  [ImageEstateRunKind.UNDO]:
    'Point every copied picture back at its old public copy and delete the private one. A picture that may no longer be shown is left alone.',
  [ImageEstateRunKind.RETIRE]:
    'Delete every old public copy. Their old addresses stop working, and the copies can no longer be undone. Check the site first.',
};

/** The copy states, as the page names them. */
export const IMAGE_ESTATE_STEP_LABELS: Readonly<Record<string, string>> = {
  PENDING: 'Being copied',
  COPIED: 'Copied, old copy still public',
  RETIRED: 'Copied, old copy deleted',
  UNDONE: 'Put back',
  FAILED: 'Could not be copied',
};

/** What a run's counts are called. */
export const IMAGE_ESTATE_COUNT_LABELS: Readonly<Record<string, string>> = {
  registered: 'Registered as unverified',
  copied: 'Copied',
  undone: 'Put back',
  retired: 'Old copies deleted',
  failed: 'Could not be handled',
};

/**
 * Private image delivery, on Scan Diagnostics (FC-040).
 *
 * Steve's decisions of 29 September 2026. Every picture becomes a private
 * Cloudflare Images object that only an address the API signs can reach.
 * The site admin takes an inventory, which reports and changes nothing;
 * copies every public picture to a private one; checks the site; and then
 * retires the old public copies. A copy can be undone until then. Each run
 * is checkpointed, may be paused and resumed, and is logged with a reason.
 */
@Component({
  selector: 'app-image-estate-panel',
  templateUrl: './image-estate-panel.component.html',
  styleUrls: [
    '../../news-admin/news-admin.component.scss',
    '../scan-diagnostics.component.scss',
    './image-estate-panel.component.scss',
  ],
  standalone: true,
  imports: [AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEstatePanelComponent implements OnInit {
  private readonly _estate = inject(ImageEstateAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly runLabels = IMAGE_ESTATE_RUN_LABELS;
  readonly stateLabels = IMAGE_ESTATE_STATE_LABELS;
  readonly stepLabels = IMAGE_ESTATE_STEP_LABELS;
  readonly kinds = ImageEstateRunKind;

  readonly state = signal<ImageEstatePanelState>({ kind: 'LOADING' });
  readonly message = signal<string | null>(null);
  readonly failure = signal<string | null>(null);

  /** The run that is open, if any. */
  readonly openRun = computed(() => {
    const state = this.state();
    const run = state.kind === 'READY' ? state.status.run : null;

    return run !== null && run.state !== ImageEstateRunState.DONE ? run : null;
  });

  /** The copies by state, as rows. */
  readonly steps = computed(() => {
    const state = this.state();

    return state.kind === 'READY'
      ? Object.entries(state.status.steps).map(([step, count]) => ({
          label: this.stepLabels[step] ?? step,
          count,
        }))
      : [];
  });

  /** The open or last run's counts, in words. */
  readonly runCounts = computed(() => {
    const state = this.state();
    const run = state.kind === 'READY' ? state.status.run : null;

    return Object.entries(run?.counts ?? {}).map(([key, count]) => ({
      label: IMAGE_ESTATE_COUNT_LABELS[key] ?? key,
      count,
    }));
  });

  /**
   * Reads where the estate stands on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads where the estate stands.
   */
  load(): void {
    this._estate
      .status()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: status => this.state.set({ kind: 'READY', status }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * Whether a run of a kind may start, when none is open: a copy needs the
   * signing key and something to copy; an undo or a retirement, a copy.
   *
   * @param status - Where the estate stands.
   * @param kind - The kind.
   * @returns True when it may.
   */
  mayStart(status: ImageEstateStatus, kind: ImageEstateRunKind): boolean {
    return kind === ImageEstateRunKind.COPY
      ? status.signingEnabled && status.remaining > 0
      : (status.steps['COPIED'] ?? 0) > 0;
  }

  /**
   * Takes an inventory.
   */
  takeInventory(): void {
    this.run(
      this._estate.takeInventory(),
      'Taking an inventory. Refresh in a moment to read it.',
    );
  }

  /**
   * Starts a run, once a reason is given.
   *
   * @param kind - Which.
   */
  start(kind: ImageEstateRunKind): void {
    this.askReason(
      this.runLabels[kind],
      RUN_MESSAGES[kind],
      this.runLabels[kind],
      reason =>
        this.run(
          this._estate.start(kind, reason),
          `${this.runLabels[kind]} started. Refresh to follow it.`,
        ),
    );
  }

  /**
   * Pauses the open run, once a reason is given.
   */
  pause(): void {
    this.askReason(
      'Pause the run',
      'It stops after the batch under way, and resumes where it stopped.',
      'Pause',
      reason => this.run(this._estate.pause(reason), 'Paused.'),
    );
  }

  /**
   * Resumes the open run, once a reason is given.
   */
  resume(): void {
    this.askReason(
      'Resume the run',
      'It carries on after the last picture it handled.',
      'Resume',
      reason => this.run(this._estate.resume(reason), 'Resumed.'),
    );
  }

  /**
   * Sends an action, says how it went and reads the estate again.
   *
   * @param action - The request.
   * @param success - What to say when it works.
   */
  private run(action: Observable<unknown>, success: string): void {
    this.message.set(null);
    this.failure.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.message.set(success);
        this.load();
      },
      error: (error: unknown) => {
        const said =
          error instanceof HttpErrorResponse
            ? (error.error as { message?: unknown } | null)?.message
            : undefined;

        this.failure.set(
          typeof said === 'string'
            ? said
            : 'That could not be done. Please try again.',
        );
      },
    });
  }

  /**
   * Asks why, and goes on with the reason once one is given. The reason is
   * kept in the site admin log.
   *
   * @param title - The dialog's title.
   * @param message - What is about to happen.
   * @param confirmText - The button.
   * @param onConfirm - Invoked with the reason.
   */
  private askReason(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: (reason: string) => void,
  ): void {
    this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, {
        width: '75%',
        data: {
          title,
          message,
          label: 'Reason',
          confirmText,
          max: ADMIN_REASON_MAX_LENGTH,
        },
      })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe(reason => {
        if (reason) {
          onConfirm(reason);
        }
      });
  }
}
