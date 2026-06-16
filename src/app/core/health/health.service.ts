import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  map,
  of,
  switchMap,
  timeout,
  timer,
} from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  API_HEALTH_STATE,
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UP,
  DEFAULT_API_HEALTH_STATE,
} from 'src/app/shared/constants/health.constants';
import {
  MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL,
  MILLISECONDS_API_HEALTH_CHECK_TIMEOUT_INTERVAL,
  MILLISECONDS_ZERO,
} from 'src/app/shared/constants/timings.constants';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly stateSubject = new BehaviorSubject<API_HEALTH_STATE>(
    DEFAULT_API_HEALTH_STATE,
  );
  readonly state$ = this.stateSubject.asObservable();
  private pollSub?: Subscription;

  /**
   * Starts periodic polling of the API health endpoint if not already running.
   *
   * Emits updated API health state values on {@link state$} at a fixed interval.
   */
  startPolling(): void {
    if (this.pollSub) return;

    this.pollSub = timer(
      MILLISECONDS_ZERO,
      MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL,
    )
      .pipe(switchMap(() => this.checkOnce()))
      .subscribe(state => this.stateSubject.next(state));
  }

  /**
   * Stops the active health polling subscription, if one exists.
   *
   * After calling this, no further automatic health checks are performed
   * until {@link startPolling} is invoked again.
   */
  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  /**
   * Performs a single health check call to the API readiness endpoint.
   *
   * Applies a timeout and maps any error or timeout to a DOWN state.
   *
   * @returns Observable that emits the resulting API health state.
   */
  checkOnce(): Observable<API_HEALTH_STATE> {
    const url = API_URLS.HEALTH_READY;

    return this.http.get<unknown>(url).pipe(
      timeout(MILLISECONDS_API_HEALTH_CHECK_TIMEOUT_INTERVAL),
      map((): API_HEALTH_STATE => API_HEALTH_STATE_UP),
      catchError((): Observable<API_HEALTH_STATE> => of(API_HEALTH_STATE_DOWN)),
    );
  }

  /**
   * Sets the current API health state to DOWN if it is not already.
   *
   * Does not emit if the state is already DOWN.
   */
  markDown(): void {
    if (this.stateSubject.value !== API_HEALTH_STATE_DOWN)
      this.stateSubject.next(API_HEALTH_STATE_DOWN);
  }

  /**
   * Sets the current API health state to UP if it is not already.
   *
   * Does not emit if the state is already UP.
   */
  markUp(): void {
    if (this.stateSubject.value !== API_HEALTH_STATE_UP)
      this.stateSubject.next(API_HEALTH_STATE_UP);
  }

  /**
   * Returns the latest known API health state snapshot.
   *
   * @returns Current API health state.
   */
  snapshot(): API_HEALTH_STATE {
    return this.stateSubject.value;
  }
}
