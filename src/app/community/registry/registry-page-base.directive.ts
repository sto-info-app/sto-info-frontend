import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Directive,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { Observable, Subscription, finalize, take } from 'rxjs';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

/** How long a load may run before the page gives up and shows an error. */
export const REGISTRY_LOAD_TIMEOUT_MS = 12000;

/**
 * Shared load lifecycle for every registry page.
 *
 * Centralises the behaviour each page needs identically: cancelling an
 * in-flight request so a late response cannot clobber newer state, a watchdog
 * for requests that never settle (LogRocket's XHR patching can deliver
 * callbacks outside the Angular zone), re-entering the zone for change
 * detection, and mapping transport failures onto user-facing copy.
 */
@Directive()
export abstract class RegistryPageBaseDirective implements OnDestroy {
  protected readonly _ngZone = inject(NgZone);
  protected readonly _cdr = inject(ChangeDetectorRef);

  /** The current in-flight request, so a new load can cancel it. */
  private _loadSubscription?: Subscription;

  isLoading = false;
  errorMessage = '';
  notFound = false;

  /**
   * Cancels any in-flight request when the page is torn down.
   */
  ngOnDestroy(): void {
    this._loadSubscription?.unsubscribe();
  }

  /**
   * Runs a registry request through the shared load lifecycle.
   *
   * @param source - The request to run.
   * @param onNext - Handler invoked with the loaded value.
   * @param failureMessage - Copy shown when the request fails for a reason
   *   other than an unreachable server or a 404.
   */
  protected runLoad<T>(
    source: Observable<T>,
    onNext: (value: T) => void,
    failureMessage: string,
  ): void {
    this._loadSubscription?.unsubscribe();

    this.isLoading = true;
    this.errorMessage = '';
    this.notFound = false;

    // `finalize` below clears this on every termination path — success, error,
    // completion without emission, and unsubscribe — so if this callback runs
    // at all, the request genuinely never settled.
    const loadingTimeout = setTimeout(() => {
      this._loadSubscription?.unsubscribe();
      this._ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'This is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, REGISTRY_LOAD_TIMEOUT_MS);

    this._loadSubscription = source
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        // Safety net: a stream that completes without emitting would otherwise
        // leave the page stuck on its loading state forever.
        finalize(() => {
          clearTimeout(loadingTimeout);
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: value => {
          onNext(value);
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, failureMessage);
          this.isLoading = false;
        },
      });
  }

  /**
   * Maps a failed request onto the not-found flag or an error message.
   *
   * @param error - The failed response.
   * @param failureMessage - Copy for a generic failure.
   */
  private handleError(error: HttpErrorResponse, failureMessage: string): void {
    if (error.status === 404) {
      this.notFound = true;
      return;
    }

    this.errorMessage =
      error.status === 0
        ? 'Unable to reach the server. Please try again later.'
        : failureMessage;
  }
}
