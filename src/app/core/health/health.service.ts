import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
  timeout,
  timer,
} from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  API_HEALTH_FAILURES_BEFORE_DOWN,
  API_HEALTH_FAILURES_BEFORE_WARNING,
  API_HEALTH_STATE,
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UP,
  DEFAULT_API_HEALTH_STATE,
  NO_API_HEALTH_FAILURES,
} from 'src/app/shared/constants/health.constants';
import {
  MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
  MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL,
  MILLISECONDS_API_HEALTH_CHECK_TIMEOUT_INTERVAL,
  MILLISECONDS_ZERO,
} from 'src/app/shared/constants/timings.constants';

/**
 * Tracks API availability.
 *
 * A single failed check is not evidence the backend is gone, so failures are
 * counted rather than acted on immediately:
 *
 * - below {@link API_HEALTH_FAILURES_BEFORE_WARNING} consecutive failures
 *   nothing is surfaced at all;
 * - from there up to {@link API_HEALTH_FAILURES_BEFORE_DOWN} the app stays
 *   usable but {@link degraded$} emits so a warning notice can be shown;
 * - at {@link API_HEALTH_FAILURES_BEFORE_DOWN} the state flips to DOWN, which
 *   is what swaps the route content for the service interruption page.
 *
 * Any single success resets the counter. While failures are accumulating the
 * poll switches to a one second cadence so the thresholds are reached in
 * seconds rather than minutes; it reverts to the normal interval on recovery.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly _http = inject(HttpClient);
  private readonly _stateSubject = new BehaviorSubject<API_HEALTH_STATE>(
    DEFAULT_API_HEALTH_STATE,
  );
  private readonly _failuresSubject = new BehaviorSubject<number>(
    NO_API_HEALTH_FAILURES,
  );
  readonly state$ = this._stateSubject.asObservable();

  /** Number of consecutive failed checks; reset to zero by any success. */
  readonly consecutiveFailures$ = this._failuresSubject.asObservable();

  /**
   * True while enough checks have failed to be worth warning about, but not
   * enough to declare the API down.
   */
  readonly degraded$ = this._failuresSubject.pipe(
    map(failures => this.isDegraded(failures)),
    distinctUntilChanged(),
  );

  private pollSub?: Subscription;
  private isPolling = false;

  /**
   * Starts periodic polling of the API health endpoint if not already running.
   *
   * Each result feeds the consecutive failure counter, which in turn decides
   * both the state emitted on {@link state$} and how soon the next check runs.
   */
  startPolling(): void {
    if (this.isPolling) return;

    this.isPolling = true;
    this.scheduleCheck(MILLISECONDS_ZERO);
  }

  /**
   * Stops the active health polling subscription, if one exists.
   *
   * After calling this, no further automatic health checks are performed
   * until {@link startPolling} is invoked again. The failure counter is left
   * alone so a backend that was already down stays down across navigation.
   */
  stopPolling(): void {
    this.isPolling = false;
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  /**
   * Performs a single health check call to the API readiness endpoint.
   *
   * Applies a timeout and maps any error or timeout to a DOWN state. This
   * reports the outcome of one call only; it does not touch the counter.
   *
   * @returns Observable that emits the resulting API health state.
   */
  checkOnce(): Observable<API_HEALTH_STATE> {
    const url = API_URLS.HEALTH_READY;

    return this._http.get<unknown>(url).pipe(
      timeout(MILLISECONDS_API_HEALTH_CHECK_TIMEOUT_INTERVAL),
      map((): API_HEALTH_STATE => API_HEALTH_STATE_UP),
      catchError((): Observable<API_HEALTH_STATE> => of(API_HEALTH_STATE_DOWN)),
    );
  }

  /**
   * Records one failed observation of the API.
   *
   * Called for failed polls and for API calls the interceptor sees fail. Only
   * flips the state to DOWN once the failure threshold is reached.
   */
  recordFailure(): void {
    const wasHealthy = this._failuresSubject.value === NO_API_HEALTH_FAILURES;

    this.applyFailure();

    // A first failure reported from outside the poller should tighten the
    // cadence straight away rather than after the pending slow tick.
    if (wasHealthy && this.isPolling) {
      this.scheduleCheck(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
    }
  }

  /**
   * Records one successful observation of the API, clearing any accumulated
   * failures and returning the state to UP.
   */
  recordSuccess(): void {
    this.applySuccess();
  }

  /**
   * Returns the latest known API health state snapshot.
   *
   * @returns Current API health state.
   */
  snapshot(): API_HEALTH_STATE {
    return this._stateSubject.value;
  }

  /**
   * Returns the current number of consecutive failed checks.
   *
   * @returns Consecutive failure count.
   */
  failureSnapshot(): number {
    return this._failuresSubject.value;
  }

  /**
   * Returns whether the API is currently degraded: failing, but not yet often
   * enough to be treated as down.
   *
   * @returns True when a degraded warning should be shown.
   */
  isDegradedSnapshot(): boolean {
    return this.isDegraded(this._failuresSubject.value);
  }

  /**
   * Queues the next health check.
   *
   * Rescheduling happens on completion rather than on a fixed interval so a
   * slow check can never overlap the one behind it.
   *
   * @param delayMs Milliseconds to wait before running the check.
   */
  private scheduleCheck(delayMs: number): void {
    this.pollSub?.unsubscribe();

    this.pollSub = timer(delayMs)
      .pipe(
        switchMap(() => this.checkOnce()),
        tap(state =>
          state === API_HEALTH_STATE_UP
            ? this.applySuccess()
            : this.applyFailure(),
        ),
      )
      .subscribe({
        complete: () => {
          if (this.isPolling) this.scheduleCheck(this.nextPollDelay());
        },
      });
  }

  /**
   * Picks the delay before the next check: tight while failures are being
   * counted, relaxed once the API is answering again.
   *
   * @returns Milliseconds to wait before the next check.
   */
  private nextPollDelay(): number {
    return this._failuresSubject.value === NO_API_HEALTH_FAILURES
      ? MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL
      : MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL;
  }

  /**
   * Increments the failure counter and declares the API down once enough
   * consecutive failures have accumulated.
   */
  private applyFailure(): void {
    const failures = this._failuresSubject.value + 1;
    this._failuresSubject.next(failures);

    if (
      failures >= API_HEALTH_FAILURES_BEFORE_DOWN &&
      this._stateSubject.value !== API_HEALTH_STATE_DOWN
    ) {
      this._stateSubject.next(API_HEALTH_STATE_DOWN);
    }
  }

  /**
   * Clears the failure counter and returns the state to UP.
   */
  private applySuccess(): void {
    if (this._failuresSubject.value !== NO_API_HEALTH_FAILURES) {
      this._failuresSubject.next(NO_API_HEALTH_FAILURES);
    }

    if (this._stateSubject.value !== API_HEALTH_STATE_UP) {
      this._stateSubject.next(API_HEALTH_STATE_UP);
    }
  }

  /**
   * Determines whether a failure count sits in the warning band.
   *
   * @param failures Consecutive failure count to classify.
   * @returns True when the count warrants a warning but not a takeover.
   */
  private isDegraded(failures: number): boolean {
    return (
      failures >= API_HEALTH_FAILURES_BEFORE_WARNING &&
      failures < API_HEALTH_FAILURES_BEFORE_DOWN
    );
  }
}
