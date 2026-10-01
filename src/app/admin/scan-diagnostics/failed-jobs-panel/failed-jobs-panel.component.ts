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

import { Observable, take } from 'rxjs';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  DiscardUnretryableResult,
  FAILED_JOB_QUEUE_LABELS,
  FAILED_JOB_QUEUES,
  FAILED_JOB_SUBJECT_LABELS,
  FailedJob,
  FailedJobPage,
  FailedJobQueue,
  NOT_RETRYABLE_LABELS,
  RetryAllResult,
} from 'src/app/models/failed-jobs.models';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { FailedJobsAdminService } from './failed-jobs-admin.service';

/** What the panel is showing. */
export type FailedJobsState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR'; readonly message: string }
  | { readonly kind: 'READY'; readonly page: FailedJobPage };

/** A queue the site admin can narrow the list to, with its count. */
export interface FailedJobQueueChoice {
  readonly value: FailedJobQueue;
  readonly label: string;
}

/** What to say when an action fails and the server gave no reason. */
export const FAILED_JOB_ACTION_ERROR =
  'That could not be done. Please try again.';

/** What to say when the list cannot be read and the server gave no reason. */
export const FAILED_JOBS_READ_ERROR =
  'The failed jobs could not be read. The queues may be unreachable.';

/**
 * The message the server gave with a refusal, such as a 409's reason or a
 * 503's "The job queues cannot be reached.".
 *
 * @param error - What the request failed with.
 * @returns The server's message, or undefined when it gave none.
 */
export function serverMessageOf(error: unknown): string | undefined {
  const said =
    error instanceof HttpErrorResponse
      ? (error.error as { message?: unknown } | null)?.message
      : undefined;

  return typeof said === 'string' ? said : undefined;
}

/**
 * Counts something in words: "1 job", "3 jobs".
 *
 * @param count - How many.
 * @param noun - What, in the singular.
 * @returns The count and the noun.
 */
export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Says what a "Retry all" came to.
 *
 * @param result - Its counts.
 * @returns A sentence for the site admin.
 */
export function retryAllOutcome(result: RetryAllResult): string {
  const more =
    result.remaining !== null && result.remaining > result.skipped
      ? ' More are left than one press looks at: press Retry all again.'
      : '';

  return (
    `Retried ${countOf(result.retried, 'job')}; left ` +
    `${result.skipped} that a retry can’t help.${more}`
  );
}

/**
 * Says what a "Discard all that can't be retried" came to.
 *
 * @param result - Its counts.
 * @returns A sentence for the site admin.
 */
export function discardOutcome(result: DiscardUnretryableResult): string {
  const more =
    result.remaining !== null && result.remaining > result.kept
      ? ' More are left than one press looks at: press it again.'
      : '';

  return (
    `Discarded ${countOf(result.discarded, 'job')}; kept ` +
    `${result.kept} that a retry could still help.${more}`
  );
}

/**
 * Failed background jobs, on Scan Diagnostics (FC-042).
 *
 * Steve's decisions of 30 September 2026. Every job a queue gave up on is
 * listed, queue by queue, newest failure first, by internal IDs and a reason
 * code only. A site admin retries one a retry can help, discards any, or
 * does either to them all; each asks for a reason, kept in the Security Log.
 * It reads when the page opens and when the page is refreshed; it does not
 * poll.
 */
@Component({
  selector: 'app-failed-jobs-panel',
  templateUrl: './failed-jobs-panel.component.html',
  styleUrls: [
    '../../news-admin/news-admin.component.scss',
    '../scan-diagnostics.component.scss',
    '../image-estate-panel/image-estate-panel.component.scss',
    './failed-jobs-panel.component.scss',
  ],
  standalone: true,
  imports: [AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FailedJobsPanelComponent implements OnInit {
  private readonly _failedJobs = inject(FailedJobsAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly queues: readonly FailedJobQueueChoice[] = FAILED_JOB_QUEUES.map(
    value => ({ value, label: FAILED_JOB_QUEUE_LABELS[value] }),
  );

  readonly state = signal<FailedJobsState>({ kind: 'LOADING' });
  readonly queue = signal<FailedJobQueue | null>(null);
  readonly pageNumber = signal(1);
  readonly message = signal<string | null>(null);
  readonly failure = signal<string | null>(null);

  /**
   * Reads the failed jobs on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads the page of failed jobs asked for, afresh.
   */
  load(): void {
    this.state.set({ kind: 'LOADING' });
    this._failedJobs
      .list(this.queue(), this.pageNumber())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => this.state.set({ kind: 'READY', page }),
        error: (error: unknown) =>
          this.state.set({
            kind: 'ERROR',
            message: serverMessageOf(error) ?? FAILED_JOBS_READ_ERROR,
          }),
      });
  }

  /**
   * Goes back to every queue's first page and reads it, as the page does on
   * Refresh. The server logs that read with the diagnostics rather than on
   * its own; a queue chosen or a later page is a read of its own.
   */
  reset(): void {
    this.queue.set(null);
    this.pageNumber.set(1);
    this.load();
  }

  /**
   * Narrows the list to one queue, or widens it to every one.
   *
   * @param value - The queue, or an empty string for every one.
   */
  choose(value: string): void {
    this.queue.set(FAILED_JOB_QUEUES.find(queue => queue === value) ?? null);
    this.pageNumber.set(1);
    this.load();
  }

  /**
   * Moves to another page.
   *
   * @param step - One back or one on.
   */
  turn(step: -1 | 1): void {
    this.pageNumber.update(page => page + step);
    this.load();
  }

  /**
   * How many pages there are.
   *
   * @param page - A page of them.
   * @returns The count, at least one.
   */
  pageCountOf(page: FailedJobPage): number {
    return Math.max(1, Math.ceil(page.total / page.pageSize));
  }

  /**
   * A queue's name, in words.
   *
   * @param queue - The queue.
   * @returns Its name, or the queue itself for one this page does not know.
   */
  queueLabelOf(queue: string): string {
    return FAILED_JOB_QUEUE_LABELS[queue] ?? queue;
  }

  /**
   * A queue's count, as the choice of queue shows it.
   *
   * @param page - The page, carrying the counts.
   * @param queue - The queue.
   * @returns The count, or "unknown" when the queue did not answer, or null
   *   when the page does not cover the queue.
   */
  countIn(page: FailedJobPage, queue: FailedJobQueue): string | null {
    if (!(queue in page.counts)) {
      return null;
    }

    const count = page.counts[queue];

    return count === null ? 'unknown' : String(count);
  }

  /**
   * What kind of thing a job concerns, in words.
   *
   * @param job - The job.
   * @returns Its kind, the code itself for one this page does not know, or
   *   nothing when the job does not say.
   */
  subjectLabelOf(job: FailedJob): string {
    return job.subjectKind === null
      ? ''
      : (FAILED_JOB_SUBJECT_LABELS[job.subjectKind] ?? job.subjectKind);
  }

  /**
   * Why a retry would do nothing for a job, in words.
   *
   * @param job - The job.
   * @returns The explanation.
   */
  whyNotRetryable(job: FailedJob): string {
    return (
      NOT_RETRYABLE_LABELS[job.notRetryableBecause ?? ''] ??
      'A retry would do nothing.'
    );
  }

  /**
   * Retries one job, once a reason is given.
   *
   * @param job - The job.
   */
  retry(job: FailedJob): void {
    this.askReason(
      'Retry the job',
      'It is sent round again, with its attempts back.',
      'Retry',
      reason =>
        this.run(
          this._failedJobs.retry(job.queue, job.jobId, reason),
          () => 'Retried.',
        ),
    );
  }

  /**
   * Discards one job, once a reason is given.
   *
   * @param job - The job.
   */
  discard(job: FailedJob): void {
    this.askReason(
      'Discard the job',
      'It is removed from its queue and never runs again.' +
        (job.retryable ? ' A retry could still help this one.' : ''),
      'Discard',
      reason =>
        this.run(
          this._failedJobs.discard(job.queue, job.jobId, reason),
          () => 'Discarded.',
        ),
    );
  }

  /**
   * Retries every job a retry can help, in the queue chosen or every one,
   * once a reason is given.
   */
  retryAll(): void {
    const queue = this.queue();

    this.askReason(
      'Retry all',
      `Every failed job ${this.scopeOf(queue)} that a retry can help is ` +
        'sent round again, up to 500 at a press. The rest are left alone.',
      'Retry all',
      reason =>
        this.run(this._failedJobs.retryAll(queue, reason), retryAllOutcome),
    );
  }

  /**
   * Discards every job a retry cannot help, in the queue chosen or every
   * one, once a reason is given.
   */
  discardUnretryable(): void {
    const queue = this.queue();

    this.askReason(
      'Discard all that can’t be retried',
      `Every failed job ${this.scopeOf(queue)} that a retry can’t help is ` +
        'removed, up to 500 at a press. Those a retry could still help are ' +
        'kept.',
      'Discard them',
      reason =>
        this.run(
          this._failedJobs.discardUnretryable(queue, reason),
          discardOutcome,
        ),
    );
  }

  /**
   * Where a bulk action reaches, in words.
   *
   * @param queue - The queue chosen, or null for every one.
   * @returns "in every queue", or the queue named.
   */
  private scopeOf(queue: FailedJobQueue | null): string {
    return queue === null
      ? 'in every queue'
      : `in ${FAILED_JOB_QUEUE_LABELS[queue]}`;
  }

  /**
   * Sends an action, says how it went and reads the list again.
   *
   * @param action - The request.
   * @param success - Says what it came to.
   */
  private run<T>(action: Observable<T>, success: (result: T) => string): void {
    this.message.set(null);
    this.failure.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: result => {
        this.message.set(success(result));
        this.load();
      },
      error: (error: unknown) => {
        this.failure.set(serverMessageOf(error) ?? FAILED_JOB_ACTION_ERROR);
        this.load();
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
