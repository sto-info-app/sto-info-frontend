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
  private readonly userIdSubject = new Subject<string>();
  userId = this.userIdSubject.asObservable();

  emitUserId(id: string) {
    this.userIdSubject.next(id);
  }
}

describe('LogRocketService', () => {
  let service: LogRocketService;
  let sharedDataService: MockSharedDataService;
  const getRequestSanitizer = () => {
    const options = (
      service as unknown as {
        getInitOptions(): Parameters<typeof LogRocket.init>[1];
      }
    ).getInitOptions();
    return options?.network?.requestSanitizer ?? (() => undefined);
  };

  beforeEach(() => {
    sharedDataService = new MockSharedDataService();
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

  it('redacts password fields within nested objects and arrays', () => {
    const sanitizer = getRequestSanitizer();

    const mockRequest = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: JSON.stringify({
        email: 'captain@ufp.com',
        password: 'PicardAlpha',
        nested: {
          confirmPassword: 'MakeItSo',
        },
        history: [
          {
            newPassword: 'Secret1',
          },
          {
            note: 'All good',
          },
        ],
      }),
    };

    const sanitizedRequest = sanitizer(mockRequest);
    const parsedBody = JSON.parse((sanitizedRequest as { body: string }).body);
    expect(parsedBody.password).toBe('[REDACTED]');
    expect(parsedBody.nested.confirmPassword).toBe('[REDACTED]');
    expect(parsedBody.history[0].newPassword).toBe('[REDACTED]');
    expect(parsedBody.history[1].note).toBe('All good');
    expect(parsedBody.email).toBe('captain@ufp.com');
  });

  it('leaves the request untouched when body is not a string', () => {
    const sanitizer = getRequestSanitizer();
    const request = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: { password: 'hidden' } as unknown as string,
    };
    expect(sanitizer(request)).toBe(request);
  });

  it('returns the original request when body lacks sensitive fields', () => {
    const sanitizer = getRequestSanitizer();
    const request = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: { email: 'seven@ufp.com' } as unknown as string,
    };
    expect(sanitizer(request)).toBe(request);
  });

  it('ignores password keys whose values are not strings and handles null references', () => {
    const sanitizer = getRequestSanitizer();
    const request = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: JSON.stringify({
        password: { hashed: 'abc123' },
        nullableField: null,
      }),
    };

    expect(sanitizer(request)).toBe(request);
  });

  it('returns the original request when JSON parsing fails', () => {
    const sanitizer = getRequestSanitizer();
    const request = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: '{ invalid json',
    };
    expect(sanitizer(request)).toBe(request);
  });

  it('returns the original request when the payload is a primitive value', () => {
    const sanitizer = getRequestSanitizer();
    const request = {
      reqId: 'test-req-id',
      url: 'https://example.com/api',
      headers: {},
      method: 'POST',
      body: JSON.stringify('plain-text'),
    };
    expect(sanitizer(request)).toBe(request);
  });

  it('returns undefined when sanitizer receives a falsy request', () => {
    const sanitizer = getRequestSanitizer();
    expect(sanitizer(undefined as never)).toBeUndefined();
  });
});
