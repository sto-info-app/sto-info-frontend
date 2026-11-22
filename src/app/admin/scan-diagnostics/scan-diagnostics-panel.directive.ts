import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Directive, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, take } from 'rxjs';

import {
  AdminReasonPrompt,
  AdminReasonRequest,
} from 'src/app/admin/admin-reason-prompt';

/** What to say when an action fails and the server gave no reason. */
export const SCAN_DIAGNOSTICS_ACTION_ERROR =
  'That could not be done. Please try again.';

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
 * The half of a Scan Diagnostics panel that acts that is the same for each
 * (FC-040 to FC-042).
 *
 * Each panel reads what it shows on arrival, asks a site admin why before
 * every action, since the reason is kept in the site admin log, and then
 * says how the action went and reads again.
 */
@Directive()
export abstract class ScanDiagnosticsPanelDirective implements OnInit {
  /** What the last action came to, once it worked. */
  readonly message = signal<string | null>(null);

  /** Why the last action did not work. */
  readonly failure = signal<string | null>(null);

  protected readonly _destroyRef = inject(DestroyRef);

  /**
   * Whether the panel reads again after an action fails as well as after one
   * works, for a panel whose list a refusal shows to be out of date.
   */
  protected readonly _reloadsAfterFailure: boolean = false;

  private readonly _reasons = new AdminReasonPrompt();

  /**
   * Reads what the panel shows on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads what the panel shows.
   */
  abstract load(): void;

  /**
   * Sends an action, says how it went and reads again.
   *
   * @param action - The request.
   * @param success - What to say when it works, or how to say what it came
   *   to.
   */
  protected run<T>(
    action: Observable<T>,
    success: string | ((result: T) => string),
  ): void {
    this.message.set(null);
    this.failure.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: result => {
        this.message.set(
          typeof success === 'string' ? success : success(result),
        );
        this.load();
      },
      error: (error: unknown) => {
        this.failure.set(
          serverMessageOf(error) ?? SCAN_DIAGNOSTICS_ACTION_ERROR,
        );

        if (this._reloadsAfterFailure) {
          this.load();
        }
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
   * @param confirmTone - `refuse` when going ahead takes something away,
   *   which makes the button red; green otherwise.
   */
  protected askReason(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: (reason: string) => void,
    confirmTone: AdminReasonRequest['confirmTone'] = 'accept',
  ): void {
    this._reasons
      .ask({ title, message, confirmText, confirmTone })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(onConfirm);
  }
}
