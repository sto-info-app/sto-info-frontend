import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of } from 'rxjs';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  API_HEALTH_FAILURES_BEFORE_DOWN,
  API_HEALTH_FAILURES_BEFORE_WARNING,
  API_HEALTH_STATE,
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import {
  MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
  MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL,
} from 'src/app/shared/constants/timings.constants';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

  const failTimes = (count: number) => {
    for (let index = 0; index < count; index++) {
      service.recordFailure();
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
  });

  it('should be created with initial UNKNOWN state and no failures', () => {
    expect(service).toBeTruthy();

    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    expect(states[0]).toBe(API_HEALTH_STATE_UNKNOWN);
    expect(service.failureSnapshot()).toBe(0);

    subscription.unsubscribe();
  });

  it('should perform a single health check and emit UP on success', async () => {
    const observable = service.checkOnce();
    const promise = firstValueFrom(observable);

    const request = httpMock.expectOne(API_URLS.HEALTH_READY);
    expect(request.request.method).toBe('GET');

    request.flush({ status: 'ok' });

    const result = await promise;
    expect(result).toBe(API_HEALTH_STATE_UP);
  });

  it('should emit DOWN when the health check fails', async () => {
    const observable = service.checkOnce();
    const promise = firstValueFrom(observable);

    const request = httpMock.expectOne(API_URLS.HEALTH_READY);

    request.flush(
      { message: 'error' },
      { status: 500, statusText: 'Server Error' },
    );

    const result = await promise;
    expect(result).toBe(API_HEALTH_STATE_DOWN);
  });

  describe('failure thresholds', () => {
    it('should not change state or warn for the first few failures', () => {
      failTimes(API_HEALTH_FAILURES_BEFORE_WARNING - 1);

      expect(service.failureSnapshot()).toBe(
        API_HEALTH_FAILURES_BEFORE_WARNING - 1,
      );
      expect(service.isDegradedSnapshot()).toBe(false);
      expect(service.snapshot()).toBe(API_HEALTH_STATE_UNKNOWN);
    });

    it('should report degraded from the warning threshold up to the down threshold', () => {
      failTimes(API_HEALTH_FAILURES_BEFORE_WARNING);
      expect(service.isDegradedSnapshot()).toBe(true);
      expect(service.snapshot()).not.toBe(API_HEALTH_STATE_DOWN);

      failTimes(
        API_HEALTH_FAILURES_BEFORE_DOWN - 1 - service.failureSnapshot(),
      );
      expect(service.failureSnapshot()).toBe(
        API_HEALTH_FAILURES_BEFORE_DOWN - 1,
      );
      expect(service.isDegradedSnapshot()).toBe(true);
      expect(service.snapshot()).not.toBe(API_HEALTH_STATE_DOWN);
    });

    it('should flip to DOWN once the down threshold is reached, and stop reporting degraded', () => {
      failTimes(API_HEALTH_FAILURES_BEFORE_DOWN);

      expect(service.snapshot()).toBe(API_HEALTH_STATE_DOWN);
      expect(service.isDegradedSnapshot()).toBe(false);
    });

    it('should emit degraded true then false as failures cross the down threshold', () => {
      const degraded: boolean[] = [];
      const subscription = service.degraded$.subscribe(value => {
        degraded.push(value);
      });

      failTimes(API_HEALTH_FAILURES_BEFORE_DOWN);

      expect(degraded).toEqual([false, true, false]);

      subscription.unsubscribe();
    });

    it('should reset the counter and return to UP on a single success', () => {
      failTimes(API_HEALTH_FAILURES_BEFORE_DOWN);
      expect(service.snapshot()).toBe(API_HEALTH_STATE_DOWN);

      service.recordSuccess();

      expect(service.failureSnapshot()).toBe(0);
      expect(service.isDegradedSnapshot()).toBe(false);
      expect(service.snapshot()).toBe(API_HEALTH_STATE_UP);
    });

    it('should not emit duplicate DOWN values once already down', () => {
      const states: API_HEALTH_STATE[] = [];
      const subscription = service.state$.subscribe(state => {
        states.push(state);
      });

      failTimes(API_HEALTH_FAILURES_BEFORE_DOWN * 2);

      const downStates = states.filter(
        state => state === API_HEALTH_STATE_DOWN,
      );
      expect(downStates).toHaveLength(1);

      subscription.unsubscribe();
    });

    it('should not emit duplicate UP values once already up', () => {
      const states: API_HEALTH_STATE[] = [];
      const subscription = service.state$.subscribe(state => {
        states.push(state);
      });

      service.recordSuccess();
      service.recordSuccess();

      const upStates = states.filter(state => state === API_HEALTH_STATE_UP);
      expect(upStates).toHaveLength(1);

      subscription.unsubscribe();
    });
  });

  describe('polling', () => {
    it('should poll once immediately and ignore a second startPolling call', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_UP));

      service.startPolling();
      service.startPolling();

      jest.advanceTimersByTime(0);

      expect(checkOnceSpy).toHaveBeenCalledTimes(1);
      expect(service.snapshot()).toBe(API_HEALTH_STATE_UP);
    });

    it('should keep the slow interval while the API is healthy', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_UP));

      service.startPolling();
      jest.advanceTimersByTime(0);
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL);
      expect(checkOnceSpy).toHaveBeenCalledTimes(2);

      service.stopPolling();
    });

    it('should switch to the fast interval while checks are failing', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_DOWN));

      service.startPolling();
      jest.advanceTimersByTime(0);
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(checkOnceSpy).toHaveBeenCalledTimes(2);

      service.stopPolling();
    });

    it('should reach DOWN after the configured number of failed polls', () => {
      jest.useFakeTimers();

      jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_DOWN));

      service.startPolling();
      jest.advanceTimersByTime(0);

      // The first check runs immediately; the rest arrive one fast interval apart.
      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL *
          (API_HEALTH_FAILURES_BEFORE_DOWN - 2),
      );
      expect(service.snapshot()).not.toBe(API_HEALTH_STATE_DOWN);
      expect(service.isDegradedSnapshot()).toBe(true);

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(service.snapshot()).toBe(API_HEALTH_STATE_DOWN);

      service.stopPolling();
    });

    it('should return to the slow interval once a check succeeds again', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_DOWN));

      service.startPolling();
      jest.advanceTimersByTime(0);

      checkOnceSpy.mockReturnValue(of(API_HEALTH_STATE_UP));
      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(checkOnceSpy).toHaveBeenCalledTimes(2);
      expect(service.failureSnapshot()).toBe(0);

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(checkOnceSpy).toHaveBeenCalledTimes(2);

      service.stopPolling();
    });

    it('should tighten the cadence when a failure is reported from outside the poller', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_UP));

      service.startPolling();
      jest.advanceTimersByTime(0);
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      // An interceptor-observed failure should not wait out the slow interval.
      checkOnceSpy.mockReturnValue(of(API_HEALTH_STATE_DOWN));
      service.recordFailure();

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_FAILING_POLLING_INTERVAL,
      );
      expect(checkOnceSpy).toHaveBeenCalledTimes(2);

      service.stopPolling();
    });

    it('should stop polling when stopPolling is called', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_UP));

      service.startPolling();
      jest.advanceTimersByTime(0);
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      service.stopPolling();
      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL * 3,
      );

      expect(checkOnceSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow polling to be restarted after being stopped', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest
        .spyOn(service, 'checkOnce')
        .mockReturnValue(of(API_HEALTH_STATE_UP));

      service.startPolling();
      jest.advanceTimersByTime(0);

      service.stopPolling();
      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL * 2,
      );

      service.startPolling();
      jest.advanceTimersByTime(0);

      expect(checkOnceSpy).toHaveBeenCalledTimes(2);

      service.stopPolling();
    });

    // stopPolling() normally tears the in-flight check down with it, but a
    // check that is already emitting when polling stops runs to completion.
    // It must not queue the next one behind it, or stopping would not stop.
    it('should not queue another check when one finishes after polling stopped', () => {
      jest.useFakeTimers();

      const checkOnceSpy = jest.spyOn(service, 'checkOnce').mockReturnValue(
        new Observable<API_HEALTH_STATE>(subscriber => {
          subscriber.next(API_HEALTH_STATE_UP);
          // Polling stops while this check is mid-flight.
          (service as unknown as { isPolling: boolean }).isPolling = false;
          subscriber.complete();
        }),
      );

      service.startPolling();
      jest.advanceTimersByTime(0);
      expect(checkOnceSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(
        MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL * 3,
      );

      expect(checkOnceSpy).toHaveBeenCalledTimes(1);
    });

    it('should keep an accumulated failure count across a polling stop', () => {
      failTimes(API_HEALTH_FAILURES_BEFORE_DOWN);

      service.stopPolling();

      expect(service.snapshot()).toBe(API_HEALTH_STATE_DOWN);
      expect(service.failureSnapshot()).toBe(API_HEALTH_FAILURES_BEFORE_DOWN);
    });
  });
});
