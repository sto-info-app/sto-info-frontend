import { ChangeDetectorRef, NgZone } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, Subscriber } from 'rxjs';

/**
 * Re-delivers an observable's notifications inside the Angular zone and forces a
 * change-detection pass after each one.
 *
 * This app loads third-party scripts (notably LogRocket) that patch
 * `XMLHttpRequest`, which defeats zone.js: HTTP callbacks then fire *outside*
 * the Angular zone and never trigger change detection on their own. The visible
 * symptom is a view that stays stuck on its loading state even though the data
 * has arrived. Historically every data component worked around this by manually
 * wrapping each `next`/`error`/`complete`/`finalize` callback in
 * `ngZone.run(() => { …; cdr.detectChanges(); })`, which was easy to forget and
 * reintroduce the bug.
 *
 * Drop this operator into the pipe instead and the subscriber callbacks can be
 * written plainly:
 *
 * ```ts
 * this.service.load()
 *   .pipe(
 *     take(1),
 *     observeInZone(this.ngZone, this.cdr),
 *     finalize(() => (this.isLoading = false)),
 *   )
 *   .subscribe({ next, error });
 * ```
 *
 * Place it *before* `finalize` (and the subscriber) so that downstream teardown
 * logic — e.g. clearing a loading flag — also runs in-zone and is reflected by
 * the change-detection pass.
 *
 * @param ngZone - The component's NgZone.
 * @param cdr - The component's ChangeDetectorRef.
 * @returns An operator that mirrors the source, re-emitting in the Angular zone.
 */
export function observeInZone<T>(
  ngZone: NgZone,
  cdr: ChangeDetectorRef,
): MonoTypeOperatorFunction<T> {
  /**
   * Forces a change-detection pass, swallowing the error a destroyed view would
   * throw so a late notification can never crash the caller.
   */
  const detect = (): void => {
    try {
      cdr.detectChanges();
    } catch {
      // The view was already destroyed; nothing to render.
    }
  };

  const runInZoneAndDetect = (notify: () => void): void => {
    ngZone.run(() => {
      notify();
      detect();
    });
  };

  const emitNext = (subscriber: Subscriber<T>, value: T): void => {
    runInZoneAndDetect(() => subscriber.next(value));
  };

  const emitError = (subscriber: Subscriber<T>, error: unknown): void => {
    runInZoneAndDetect(() => subscriber.error(error));
  };

  const emitComplete = (subscriber: Subscriber<T>): void => {
    runInZoneAndDetect(() => subscriber.complete());
  };

  return (source: Observable<T>) =>
    new Observable<T>(subscriber => {
      const subscription = source.subscribe({
        next: value => emitNext(subscriber, value),
        error: error => emitError(subscriber, error),
        complete: () => emitComplete(subscriber),
      });

      return () => subscription.unsubscribe();
    });
}
