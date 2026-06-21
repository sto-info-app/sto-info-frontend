import { ChangeDetectorRef, NgZone } from '@angular/core';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';

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

  return (source: Observable<T>) =>
    new Observable<T>(subscriber =>
      source.subscribe({
        next: value =>
          ngZone.run(() => {
            subscriber.next(value);
            detect();
          }),
        error: error =>
          ngZone.run(() => {
            subscriber.error(error);
            detect();
          }),
        complete: () =>
          ngZone.run(() => {
            subscriber.complete();
            detect();
          }),
      }),
    );
}
