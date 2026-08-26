import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, DestroyRef, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

/** What the runner shows progress and failure on. */
export interface StorytimeActionHost {
  /** Whether the page is waiting on the server. */
  isLoading: boolean;

  /** What to tell the reader when something failed. */
  errorMessage: string;
}

/** What to say when the server does not explain a refusal itself. */
const DEFAULT_FAILURE_MESSAGE =
  'That change could not be saved. Please try again shortly.';

/**
 * Sends a change to the server on behalf of a Storytime list, then reloads it.
 *
 * Every managed list does the same thing with a change: show it is working,
 * clear the last complaint, and — because the server settles what the result
 * actually is — reload rather than guess. Doing that in one place keeps the
 * lists from drifting apart in how they report a refusal.
 *
 * Construct it in an injection context, so it can take the component's own
 * destroy, zone and change detection references.
 */
export class StorytimeActionRunner {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * @param _host - The component whose progress and error state to keep.
   * @param _reload - How to reload the list once the server has accepted.
   * @param _failureMessage - What to say when the server explains nothing.
   */
  constructor(
    private readonly _host: StorytimeActionHost,
    private readonly _reload: () => void,
    private readonly _failureMessage: string = DEFAULT_FAILURE_MESSAGE,
  ) {}

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   * @param onSuccess - Anything else to do once it succeeds.
   */
  run(action: Observable<unknown>, onSuccess?: () => void): void {
    this._host.isLoading = true;
    this._host.errorMessage = '';

    action
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          onSuccess?.();
          this._reload();
        },
        error: (error: HttpErrorResponse) => {
          // The server names the specific problem, which is more use than a
          // generic apology when it can.
          this._host.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            this._failureMessage;
          this._host.isLoading = false;
        },
      });
  }
}
