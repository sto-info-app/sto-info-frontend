import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

import { take } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import { PublicationPause } from 'src/app/models/scan-diagnostics.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { PublicationPauseAdminService } from './publication-pause-admin.service';

/** What the control is showing. */
export type PublicationPauseState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly pause: PublicationPause };

/** What to say when a change fails and the server gave no reason. */
export const PUBLICATION_PAUSE_ERROR =
  'That could not be done. Please try again.';

/**
 * What stands for a site admin whose account has gone, as the Security Log
 * says it.
 */
export const ACCOUNT_SINCE_CLOSED = 'An account since closed';

/**
 * Who paused publication, in words (FC-042).
 *
 * @param pause - The switch.
 * @param myUserId - The site admin reading, if known.
 * @returns "You", their username, "An account since closed" when their
 *   account has gone, or "Unknown" when the switch does not say.
 */
export function pausedByOf(
  pause: PublicationPause,
  myUserId: string | null,
): string {
  if (pause.pausedByUserId === null && pause.pausedByUsername === null) {
    return 'Unknown';
  }

  if (pause.pausedByUserId !== null && pause.pausedByUserId === myUserId) {
    return 'You';
  }

  return pause.pausedByUsername ?? ACCOUNT_SINCE_CLOSED;
}

/**
 * What to say once publication is paused or resumed, as the server now has
 * it. While the job queues cannot be reached, the switch still changes, but
 * the queue only follows it once they answer.
 *
 * @param pause - The switch, as the server now has it.
 * @returns The sentence.
 */
export function pauseOutcome(pause: PublicationPause): string {
  if (pause.paused) {
    return pause.queuePaused === null
      ? 'Publication paused. The job queues can’t be reached just now; ' +
          'nothing is published meanwhile.'
      : 'Publication paused.';
  }

  return pause.queuePaused === null
    ? 'Publication resumed. Everything held publishes once the job queues ' +
        'can be reached.'
    : 'Publication resumed. Everything held is publishing.';
}

/** Pausing and resuming, as the dialog asks about each. */
const ACTIONS = {
  pause: {
    title: 'Pause publication',
    message:
      'Uploads are still accepted and scanned, but nothing is published ' +
      'until publication resumes. Every site admin is told if it stays ' +
      'paused for more than an hour.',
    confirmText: 'Pause publication',
  },
  resume: {
    title: 'Resume publication',
    message: 'Everything held while it was paused publishes.',
    confirmText: 'Resume publication',
  },
} as const;

/**
 * The publication pause, on the Admin page (FC-042).
 *
 * Steve's decision of 30 September 2026: a kill switch for everything the
 * scanner clears. While it is on, uploads are still accepted and scanned,
 * and nothing is published; when it is off, everything held publishes.
 * Each change asks for a reason, kept in the Security Log.
 */
@Component({
  selector: 'app-publication-pause',
  templateUrl: './publication-pause.component.html',
  styleUrls: ['./publication-pause.component.scss'],
  standalone: true,
  imports: [AppDatePipe, HelpLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicationPauseComponent implements OnInit {
  private readonly _pause = inject(PublicationPauseAdminService);
  private readonly _authService = inject(AuthService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly state = signal<PublicationPauseState>({ kind: 'LOADING' });
  readonly message = signal<string | null>(null);
  readonly failure = signal<string | null>(null);

  /**
   * Reads the switch on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads the switch.
   */
  load(): void {
    this._pause
      .read()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: pause => this.state.set({ kind: 'READY', pause }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * Who paused publication, in words.
   *
   * @param pause - The switch.
   * @returns "You", their username, or what stands in for one.
   */
  pausedBy(pause: PublicationPause): string {
    return pausedByOf(pause, this._authService.getUserId());
  }

  /**
   * Pauses publication while it runs, or resumes it while it is paused,
   * once a reason is given.
   *
   * @param pause - The switch, as the page shows it.
   */
  toggle(pause: PublicationPause): void {
    const action = pause.paused ? 'resume' : 'pause';
    const copy = ACTIONS[action];

    this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, {
        width: '75%',
        data: {
          title: copy.title,
          message: copy.message,
          label: 'Reason',
          confirmText: copy.confirmText,
          max: ADMIN_REASON_MAX_LENGTH,
        },
      })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe(reason => {
        if (reason) {
          this.send(action, reason);
        }
      });
  }

  /**
   * Sends the change, and shows the switch as the server now has it.
   *
   * @param action - Pause or resume.
   * @param reason - Why.
   */
  private send(action: 'pause' | 'resume', reason: string): void {
    this.message.set(null);
    this.failure.set(null);
    this._pause
      .set(action, reason)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: pause => {
          this.state.set({ kind: 'READY', pause });
          this.message.set(pauseOutcome(pause));
        },
        error: (error: unknown) => {
          const said =
            error instanceof HttpErrorResponse
              ? (error.error as { message?: unknown } | null)?.message
              : undefined;

          this.failure.set(
            typeof said === 'string' ? said : PUBLICATION_PAUSE_ERROR,
          );
          this.load();
        },
      });
  }
}
