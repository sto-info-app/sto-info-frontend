import { TestBed } from '@angular/core/testing';
import LogRocket from 'logrocket';
import { Subject } from 'rxjs';

import { environment } from 'src/environments/environment';
import { LogRocketService } from './log-rocket.service';
import { SharedDataService } from './shared-data.service';

jest.mock('logrocket', () => ({
  init: jest.fn(),
  identify: jest.fn(),
}));

class MockSharedDataService {
  private readonly _userIdSubject = new Subject<string>();
  userId = this._userIdSubject.asObservable();

  emitUserId(id: string) {
    this._userIdSubject.next(id);
  }
}

describe('LogRocketService', () => {
  let service: LogRocketService;
  let sharedDataService: MockSharedDataService;

  beforeEach(() => {
    sharedDataService = new MockSharedDataService();
    // Ensure environment variables are set for tests
    (
      environment as unknown as { logRocketAppId: string; env_name: string }
    ).logRocketAppId = 'test-app-id';
    (
      environment as unknown as { logRocketAppId: string; env_name: string }
    ).env_name = 'dev';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SharedDataService, useValue: sharedDataService }],
    });
    service = TestBed.inject(LogRocketService);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not initialise when the LogRocket app ID is missing', () => {
    const originalAppId = environment.logRocketAppId;
    const tempSharedDataService = new MockSharedDataService();

    TestBed.resetTestingModule();
    (
      environment as unknown as { logRocketAppId?: string | null }
    ).logRocketAppId = undefined;

    TestBed.configureTestingModule({
      providers: [
        { provide: SharedDataService, useValue: tempSharedDataService },
      ],
    });

    const tempService = TestBed.inject(LogRocketService);
    tempService.init();

    expect(LogRocket.init).not.toHaveBeenCalled();
    expect(tempService.isInitialised).toBe(false);

    environment.logRocketAppId = originalAppId;
  });

  it('initialises LogRocket and identifies emitted user IDs', () => {
    service.init();

    expect(LogRocket.init).toHaveBeenNthCalledWith(
      1,
      environment.logRocketAppId,
      expect.objectContaining({
        network: expect.any(Object),
      }),
    );

    expect(service.isInitialised).toBe(true);

    sharedDataService.emitUserId('alpha-1');
    expect(LogRocket.identify).toHaveBeenCalledWith('alpha-1');
  });

  it('shutdown resets the initialised state and re-initialises LogRocket blankly', () => {
    service.init();
    jest.clearAllMocks();

    service.shutdown();

    expect(LogRocket.init).toHaveBeenCalledWith(' ');
    expect(service.isInitialised).toBe(false);
  });

  it('ignores shutdown calls when the service has not been initialised', () => {
    service.shutdown();
    expect(LogRocket.init).not.toHaveBeenCalled();
  });

  it('identify does nothing when LogRocket is not initialised', () => {
    service.identify('beta-3');
    expect(LogRocket.identify).not.toHaveBeenCalled();
  });

  it('identify forwards the user when the service is initialised', () => {
    service.init();
    jest.clearAllMocks();

    service.identify('gamma-7');
    expect(LogRocket.identify).toHaveBeenCalledWith('gamma-7');
  });

  it('completes subscriptions when destroyed', () => {
    const destroySubject = (service as unknown as { destroy$: Subject<void> })
      .destroy$;
    const nextSpy = jest.spyOn(destroySubject, 'next');
    const completeSpy = jest.spyOn(destroySubject, 'complete');

    service.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  // FC-038: a canary typed, read or sent never reaches LogRocket.
  it('masks the page and drops every body and credential', () => {
    const options = (
      service as unknown as {
        getInitOptions(): Parameters<typeof LogRocket.init>[1];
      }
    ).getInitOptions();
    const canary = 'OFFICER-CANARY';
    const request = options!.network!.requestSanitizer!({
      reqId: 'r1',
      url: 'https://example.com/api/chat',
      method: 'POST',
      headers: { Authorization: `Bearer ${canary}`, 'Content-Type': 'json' },
      body: JSON.stringify({ body: canary }),
    });
    const response = options!.network!.responseSanitizer!({
      reqId: 'r1',
      status: 200,
      method: 'POST',
      url: 'https://example.com/api/chat',
      headers: { 'set-cookie': canary },
      body: JSON.stringify({ characterName: canary }),
    });

    expect(options!.dom).toEqual({ textSanitizer: true, inputSanitizer: true });
    expect(JSON.stringify(request)).not.toContain(canary);
    expect(JSON.stringify(response)).not.toContain(canary);
    expect(request!.headers).toEqual({ 'Content-Type': 'json' });
  });

  it('passes nothing on when there is nothing to sanitise', () => {
    const options = (
      service as unknown as {
        getInitOptions(): Parameters<typeof LogRocket.init>[1];
      }
    ).getInitOptions();

    expect(options!.network!.requestSanitizer!(null as never)).toBeNull();
    expect(options!.network!.responseSanitizer!(null as never)).toBeNull();
    expect(
      options!.network!.requestSanitizer!({
        reqId: 'r2',
        url: 'u',
        method: 'GET',
        headers: undefined as never,
      })!.headers,
    ).toEqual({});
  });
});
