import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  API_HEALTH_STATE,
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { MILLISECONDS_API_HEALTH_CHECK_POLLING_INTERVAL } from 'src/app/shared/constants/timings.constants';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

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

  it('should be created with initial UNKNOWN state', () => {
    expect(service).toBeTruthy();

    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    expect(states[0]).toBe(API_HEALTH_STATE_UNKNOWN);

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

  it('should poll periodically after startPolling is called once', () => {
    jest.useFakeTimers();

    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    const checkOnceSpy = jest
      .spyOn(service, 'checkOnce')
      .mockReturnValueOnce(of(API_HEALTH_STATE_UNKNOWN));

    service.startPolling();
    service.startPolling();

    jest.runOnlyPendingTimers();

    expect(checkOnceSpy).toHaveBeenCalledTimes(1);
    expect(states[0]).toBe(API_HEALTH_STATE_UNKNOWN);

    subscription.unsubscribe();
  });

  it('should update state$ when polling succeeds', () => {
    jest.useFakeTimers();

    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    jest.spyOn(service, 'checkOnce').mockReturnValue(of(API_HEALTH_STATE_UP));

    service.startPolling();

    jest.advanceTimersByTime(0);

    expect(states).toEqual([API_HEALTH_STATE_UNKNOWN, API_HEALTH_STATE_UP]);

    subscription.unsubscribe();
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
  });

  it('snapshot should reflect the latest state', () => {
    expect(service.snapshot()).toBe(API_HEALTH_STATE_UNKNOWN);

    service.markUp();
    expect(service.snapshot()).toBe(API_HEALTH_STATE_UP);

    service.markDown();
    expect(service.snapshot()).toBe(API_HEALTH_STATE_DOWN);
  });

  it('should emit correct sequence when transitioning between UP and DOWN', () => {
    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    service.markUp();
    service.markDown();

    expect(states).toEqual([
      API_HEALTH_STATE_UNKNOWN,
      API_HEALTH_STATE_UP,
      API_HEALTH_STATE_DOWN,
    ]);

    subscription.unsubscribe();
  });

  it('should mark the state as DOWN and not emit duplicate DOWN values', () => {
    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    service.markDown();
    const firstSnapshot = service.snapshot();
    service.markDown();
    const secondSnapshot = service.snapshot();

    expect(firstSnapshot).toBe(API_HEALTH_STATE_DOWN);
    expect(secondSnapshot).toBe(API_HEALTH_STATE_DOWN);

    const downStates = states.filter(state => state === API_HEALTH_STATE_DOWN);
    expect(downStates.length).toBe(1);

    subscription.unsubscribe();
  });

  it('should mark the state as UP and not emit duplicate UP values', () => {
    const states: API_HEALTH_STATE[] = [];
    const subscription = service.state$.subscribe(state => {
      states.push(state);
    });

    service.markUp();
    const firstSnapshot = service.snapshot();
    service.markUp();
    const secondSnapshot = service.snapshot();

    expect(firstSnapshot).toBe(API_HEALTH_STATE_UP);
    expect(secondSnapshot).toBe(API_HEALTH_STATE_UP);

    const upStates = states.filter(state => state === API_HEALTH_STATE_UP);
    expect(upStates.length).toBe(1);

    subscription.unsubscribe();
  });
});
