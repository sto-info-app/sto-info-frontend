import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { CookieService } from './shared/services/cookie.service';
import { LogRocketService } from './shared/services/log-rocket.service';
import { PageTitleService } from './shared/services/page-title.service';
import { ScriptLoaderService } from './shared/services/script-loader.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let mockAuthService: {
    isAuthenticated$: Subject<boolean>;
    warningAnnounced$: Subject<number>;
    expiryAnnounced$: Subject<number>;
    performLogout: jest.Mock;
    refreshToken: jest.Mock;
    getSecondsUntilLoginSessionExpiry: jest.Mock<number, []>;
  };

  let mockCookieService: {
    readCookie: jest.Mock<string | undefined, [string]>;
    setUserAcceptedCookieCategories: jest.Mock<void, [string[]]>;
    isCookieCategoryAccepted: jest.Mock<boolean, [string]>;
  };

  let mockLogRocketService: { init: jest.Mock; shutdown: jest.Mock };
  let mockPageTitleService: { init: jest.Mock };
  let mockScriptLoaderService: {
    loadScript: jest.Mock<
      void,
      [
        {
          id: string;
          src: string;
          async?: boolean;
          attributes?: Record<string, string>;
          onLoad?: () => void;
          onError?: () => void;
        },
      ]
    >;
    shouldDisableAnalytics: jest.Mock<boolean, []>;
  };

  let routerEvents$: Subject<unknown>;
  let mockRouter: Router;
  let mockDialog: {
    open: jest.Mock<
      MatDialogRef<RefreshSessionDialogComponent>,
      [
        typeof RefreshSessionDialogComponent,
        {
          hasBackdrop: boolean;
          data: { appComponent: AppComponent };
        },
      ]
    >;
  };

  const runWithPatchedTimer = <K extends 'setTimeout' | 'setInterval'>(
    key: K,
    testBody: () => void,
  ) => {
    const original = globalThis[key];

    (globalThis as unknown as Record<string, unknown>)[key] = ((
      handler: TimerHandler,
    ) => {
      if (typeof handler === 'function') {
        handler();
      }
      return 1;
    }) as unknown;

    try {
      testBody();
    } finally {
      (globalThis as unknown as Record<string, unknown>)[key] = original;
    }
  };

  const mockScriptLoadSuccess = () => {
    mockScriptLoaderService.loadScript.mockImplementation(options => {
      options.onLoad?.();
    });
  };

  const mockScriptLoadFailure = () => {
    mockScriptLoaderService.loadScript.mockImplementation(options => {
      options.onError?.();
    });
  };

  beforeEach(async () => {
    routerEvents$ = new Subject<unknown>();

    mockAuthService = {
      isAuthenticated$: new Subject<boolean>(),
      warningAnnounced$: new Subject<number>(),
      expiryAnnounced$: new Subject<number>(),
      performLogout: jest.fn(),
      refreshToken: jest.fn().mockReturnValue(of(true)),
      getSecondsUntilLoginSessionExpiry: jest.fn().mockReturnValue(10),
    };

    mockCookieService = {
      readCookie: jest.fn(),
      setUserAcceptedCookieCategories: jest.fn(),
      isCookieCategoryAccepted: jest.fn().mockReturnValue(false),
    };

    mockLogRocketService = {
      init: jest.fn(),
      shutdown: jest.fn(),
    };

    mockPageTitleService = {
      init: jest.fn(),
    };

    mockScriptLoaderService = {
      loadScript: jest.fn(),
      shouldDisableAnalytics: jest.fn().mockReturnValue(false),
    };

    mockDialog = {
      open: jest.fn(),
    };

    mockRouter = {
      events: routerEvents$,
    } as unknown as Router;

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CookieService, useValue: mockCookieService },
        { provide: LogRocketService, useValue: mockLogRocketService },
        { provide: PageTitleService, useValue: mockPageTitleService },
        { provide: ScriptLoaderService, useValue: mockScriptLoaderService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: 'API_URL', useValue: environment.apiUrl },
      ],
    })
      .overrideComponent(AppComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create the app and initialise the page title service', () => {
    expect(component).toBeTruthy();
    expect(mockPageTitleService.init).toHaveBeenCalled();
  });

  it('should update login state and start countdown when authenticated', () => {
    runWithPatchedTimer('setInterval', () => {
      mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(0);

      component.ngOnInit();
      mockAuthService.isAuthenticated$.next(true);

      expect(component.isLoggedIn).toBe(true);
      expect(mockAuthService.performLogout).toHaveBeenCalled();
    });
  });

  it('should stop countdown when authentication state changes to not logged in', () => {
    const stopCountdownSpy = jest.spyOn(
      component as unknown as { stopCountdown: () => void },
      'stopCountdown',
    );

    (
      component as unknown as { intervalId: ReturnType<typeof setInterval> }
    ).intervalId = 1 as unknown as ReturnType<typeof setInterval>;

    (
      component as unknown as { subscribeToAuthenticationState: () => void }
    ).subscribeToAuthenticationState();

    mockAuthService.isAuthenticated$.next(false);

    expect(stopCountdownSpy).toHaveBeenCalled();
  });

  it('should stop countdown and perform logout on explicit logout', () => {
    const originalClearInterval = globalThis.clearInterval;
    const clearIntervalSpy = jest.fn();
    (
      globalThis as unknown as { clearInterval: typeof clearInterval }
    ).clearInterval = clearIntervalSpy as unknown as typeof clearInterval;

    (
      component as unknown as { intervalId: ReturnType<typeof setInterval> }
    ).intervalId = 1 as unknown as ReturnType<typeof setInterval>;

    component.logout();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(mockAuthService.performLogout).toHaveBeenCalled();

    (
      globalThis as unknown as { clearInterval: typeof clearInterval }
    ).clearInterval = originalClearInterval;
  });

  it('should open the refresh session dialog when appropriate', () => {
    const afterClosed$ = of(true);
    const dialogRefMock = {
      afterClosed: jest.fn().mockReturnValue(afterClosed$),
      close: jest.fn(),
    } as unknown as MatDialogRef<RefreshSessionDialogComponent>;

    const dialogOpenSpy = jest
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
      .mockReturnValue(dialogRefMock);

    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;
    (
      component as unknown as { autoLogoutCountdown: number }
    ).autoLogoutCountdown = 30;
    (
      component as unknown as { intervalId: ReturnType<typeof setInterval> }
    ).intervalId = 1 as unknown as ReturnType<typeof setInterval>;

    (
      component as unknown as { openRefreshSessionDialog: () => void }
    ).openRefreshSessionDialog();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(mockAuthService.refreshToken).toHaveBeenCalled();
  });

  it('should not open the refresh dialog if already open', () => {
    const dialogRefMock = {} as MatDialogRef<RefreshSessionDialogComponent>;
    (
      component as unknown as {
        dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null;
      }
    ).dialogRef = dialogRefMock;

    (
      component as unknown as { autoLogoutCountdown: number }
    ).autoLogoutCountdown = 30;
    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

    (
      component as unknown as { openRefreshSessionDialog: () => void }
    ).openRefreshSessionDialog();

    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should trigger refresh session warning on warning announcement', () => {
    const openRefreshSessionDialogSpy = jest.spyOn(
      component as unknown as { openRefreshSessionDialog: () => void },
      'openRefreshSessionDialog',
    );

    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;
    (
      component as unknown as { intervalId: ReturnType<typeof setInterval> }
    ).intervalId = 1 as unknown as ReturnType<typeof setInterval>;

    (
      component as unknown as { subscribeToWarningAnnouncements: () => void }
    ).subscribeToWarningAnnouncements();

    runWithPatchedTimer('setTimeout', () => {
      const futureTime = Date.now() + 1000;
      mockAuthService.warningAnnounced$.next(futureTime);

      expect(openRefreshSessionDialogSpy).toHaveBeenCalled();
    });
  });

  it('should handle expiry announcements by logging out when expired', () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(2000);

    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

    (
      component as unknown as { subscribeTExpiryAnnouncements: () => void }
    ).subscribeTExpiryAnnouncements();

    mockAuthService.expiryAnnounced$.next(1000);

    expect(mockAuthService.performLogout).toHaveBeenCalled();

    dateNowSpy.mockRestore();
  });

  it('should handle expiry announcements by starting countdown when not yet expired', () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);

    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

    const startCountdownSpy = jest
      .spyOn(
        component as unknown as { startCountdown: () => void },
        'startCountdown',
      )
      .mockImplementation(() => {});

    (
      component as unknown as { subscribeTExpiryAnnouncements: () => void }
    ).subscribeTExpiryAnnouncements();

    mockAuthService.expiryAnnounced$.next(2000);

    expect(startCountdownSpy).toHaveBeenCalled();

    dateNowSpy.mockRestore();
  });

  it('should reset scroll position on navigation end', () => {
    const scrollToSpy = jest.fn();
    const originalScrollTo = globalThis.scrollTo;

    (globalThis as { scrollTo?: typeof scrollTo }).scrollTo =
      scrollToSpy as unknown as typeof scrollTo;

    (
      component as unknown as { resetScrollPositionOnNavigationEnd: () => void }
    ).resetScrollPositionOnNavigationEnd();

    runWithPatchedTimer('setTimeout', () => {
      const event = new NavigationEnd(1, '/old', '/new');
      routerEvents$.next(event);

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    });

    (globalThis as { scrollTo?: typeof scrollTo }).scrollTo = originalScrollTo;
  });

  it('should track page views on navigation when environment is not local', () => {
    const originalEnvName = environment.env_name;
    (environment as { env_name: string }).env_name = 'test';

    const loadCookieYesScriptSpy = jest
      .spyOn(
        component as unknown as { loadCookieYesScript: () => void },
        'loadCookieYesScript',
      )
      .mockImplementation(() => {});

    const trackPageViewsOnNavigationSpy = jest
      .spyOn(
        component as unknown as { trackPageViewsOnNavigation: () => void },
        'trackPageViewsOnNavigation',
      )
      .mockImplementation(() => {});

    component.ngOnInit();

    expect(loadCookieYesScriptSpy).toHaveBeenCalled();
    expect(trackPageViewsOnNavigationSpy).toHaveBeenCalled();

    (environment as { env_name: string }).env_name = originalEnvName;
  });

  it('should extract accepted consent cookie categories and set them', () => {
    const values = [
      'necessary:yes',
      'analytics:yes',
      'consentid:abc',
      'ads:no',
    ];

    (
      component as unknown as {
        extractAcceptedConsentCookieCategories: (
          cookieValues: string[],
        ) => void;
      }
    ).extractAcceptedConsentCookieCategories(values);

    expect(
      mockCookieService.setUserAcceptedCookieCategories,
    ).toHaveBeenCalledWith(['necessary', 'analytics']);
  });

  it('should load CookieYes script and handle consent updates', () => {
    mockCookieService.readCookie.mockReturnValue('necessary:yes,analytics:yes');

    const checkCookieConsentStateSpy = jest.spyOn(
      component as unknown as { checkCookieConsentState: () => void },
      'checkCookieConsentState',
    );

    mockScriptLoaderService.loadScript.mockImplementation(options => {
      (globalThis as unknown as { CookieYes?: { run: () => void } }).CookieYes =
        { run: jest.fn() };

      options.onLoad?.();

      document.dispatchEvent(
        new CustomEvent('cookieyes_consent_update', {
          detail: { accepted: ['analytics'] },
        }),
      );
    });

    (
      component as unknown as { loadCookieYesScript: () => void }
    ).loadCookieYesScript();

    expect(mockScriptLoaderService.loadScript).toHaveBeenCalled();
    expect(checkCookieConsentStateSpy).toHaveBeenCalled();
  });

  it('should log an error when CookieYes URL is not set', () => {
    const originalUrl = environment.cookieYesUrl;
    (environment as { cookieYesUrl: string | undefined }).cookieYesUrl = '';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (
      component as unknown as { loadCookieYesScript: () => void }
    ).loadCookieYesScript();

    expect(errorSpy).toHaveBeenCalledWith(
      'CookieYes URL not set in environment',
    );
    expect(mockScriptLoaderService.loadScript).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    (environment as { cookieYesUrl: string | undefined }).cookieYesUrl =
      originalUrl;
  });

  it('should log an error when CookieYes script fails to load', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockCookieService.readCookie.mockReturnValue(undefined);

    mockScriptLoadFailure();

    (
      component as unknown as { loadCookieYesScript: () => void }
    ).loadCookieYesScript();

    expect(errorSpy).toHaveBeenCalledWith('Failed to load CookieYes script');

    errorSpy.mockRestore();
  });

  it('should check cookie consent state and call consentGiven when analytics accepted and analytics not disabled', () => {
    mockCookieService.isCookieCategoryAccepted.mockReturnValue(true);
    mockScriptLoaderService.shouldDisableAnalytics.mockReturnValue(false);

    const consentGivenSpy = jest.spyOn(
      component as unknown as { consentGiven: () => void },
      'consentGiven',
    );
    const consentDeniedSpy = jest.spyOn(
      component as unknown as { consentDenied: () => void },
      'consentDenied',
    );

    (
      component as unknown as { checkCookieConsentState: () => void }
    ).checkCookieConsentState();

    expect(mockScriptLoaderService.shouldDisableAnalytics).toHaveBeenCalled();
    expect(consentGivenSpy).toHaveBeenCalled();
    expect(consentDeniedSpy).not.toHaveBeenCalled();
  });

  it('should check cookie consent state and call consentDenied when analytics not accepted', () => {
    mockCookieService.isCookieCategoryAccepted.mockReturnValue(false);
    mockScriptLoaderService.shouldDisableAnalytics.mockReturnValue(false);

    const consentGivenSpy = jest.spyOn(
      component as unknown as { consentGiven: () => void },
      'consentGiven',
    );
    const consentDeniedSpy = jest.spyOn(
      component as unknown as { consentDenied: () => void },
      'consentDenied',
    );

    (
      component as unknown as { checkCookieConsentState: () => void }
    ).checkCookieConsentState();

    expect(mockScriptLoaderService.shouldDisableAnalytics).toHaveBeenCalled();
    expect(consentDeniedSpy).toHaveBeenCalled();
    expect(consentGivenSpy).not.toHaveBeenCalled();
  });

  it('should call consentDenied when analytics is disabled by the script loader even if user has consented', () => {
    mockCookieService.isCookieCategoryAccepted.mockReturnValue(true);
    mockScriptLoaderService.shouldDisableAnalytics.mockReturnValue(true);

    const consentGivenSpy = jest.spyOn(
      component as unknown as { consentGiven: () => void },
      'consentGiven',
    );
    const consentDeniedSpy = jest.spyOn(
      component as unknown as { consentDenied: () => void },
      'consentDenied',
    );

    (
      component as unknown as { checkCookieConsentState: () => void }
    ).checkCookieConsentState();

    expect(mockScriptLoaderService.shouldDisableAnalytics).toHaveBeenCalled();
    expect(consentDeniedSpy).toHaveBeenCalled();
    expect(consentGivenSpy).not.toHaveBeenCalled();
  });

  it('should determine if user has consented to analytics cookies', () => {
    mockCookieService.isCookieCategoryAccepted.mockReturnValueOnce(true);

    const result = (
      component as unknown as {
        hasUserConsentedToAnalytics: () => boolean;
      }
    ).hasUserConsentedToAnalytics();

    expect(result).toBe(true);
    expect(mockCookieService.isCookieCategoryAccepted).toHaveBeenCalledWith(
      'analytics',
    );
  });

  it('should call Google Analytics and LogRocket when consent is given in non-local env', () => {
    (environment as { env_name: string }).env_name = 'test';

    mockScriptLoadSuccess();

    (component as unknown as { consentGiven: () => void }).consentGiven();

    expect(mockScriptLoaderService.loadScript).toHaveBeenCalled();
    expect(mockLogRocketService.init).toHaveBeenCalled();
  });

  it('should disable analytics and LogRocket when consent is denied', () => {
    const disableGoogleAnalyticsTrackingSpy = jest.spyOn(
      component as unknown as { disableGoogleAnalyticsTracking: () => void },
      'disableGoogleAnalyticsTracking',
    );
    const disableLogRocketSpy = jest.spyOn(
      component as unknown as { disableLogRocket: () => void },
      'disableLogRocket',
    );

    (component as unknown as { consentDenied: () => void }).consentDenied();

    expect(disableGoogleAnalyticsTrackingSpy).toHaveBeenCalled();
    expect(disableLogRocketSpy).toHaveBeenCalled();
  });

  it('should enable Google Analytics tracking when measurement ID is set', () => {
    (environment as { gaMeasurementId: string }).gaMeasurementId =
      'G-TEST-MEASUREMENT';

    const gtagMock = jest.fn();

    (globalThis as unknown as { gtag?: typeof gtagMock }).gtag = gtagMock;

    (
      component as unknown as { enableGoogleAnalyticsTracking: () => void }
    ).enableGoogleAnalyticsTracking();

    expect(
      (globalThis as unknown as { [key: string]: boolean })[
        'ga-disable-G-TEST-MEASUREMENT'
      ],
    ).toBe(false);
    expect(gtagMock).toHaveBeenCalled();
  });

  it('should disable Google Analytics tracking', () => {
    (environment as { gaMeasurementId: string }).gaMeasurementId =
      'G-TEST-MEASUREMENT';

    const dataLayer: unknown[] = [];
    (globalThis as { dataLayer?: unknown[] }).dataLayer = dataLayer;

    (
      component as unknown as { disableGoogleAnalyticsTracking: () => void }
    ).disableGoogleAnalyticsTracking();

    expect(
      (globalThis as unknown as { [key: string]: boolean })[
        'ga-disable-G-TEST-MEASUREMENT'
      ],
    ).toBe(true);
    expect(dataLayer.length).toBe(1);
  });

  it('should warn and skip loading Google Analytics when measurement ID is missing', () => {
    const originalId = environment.gaMeasurementId;
    (environment as { gaMeasurementId: string }).gaMeasurementId = '';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    (
      component as unknown as {
        loadGoogleAnalyticsWithTrackingDisabled: () => void;
      }
    ).loadGoogleAnalyticsWithTrackingDisabled();

    expect(warnSpy).toHaveBeenCalled();

    (environment as { gaMeasurementId: string }).gaMeasurementId = originalId;
  });

  it('should load Google Analytics script and then enable tracking', () => {
    const enableSpy = jest.spyOn(
      component as unknown as { enableGoogleAnalyticsTracking: () => void },
      'enableGoogleAnalyticsTracking',
    );

    mockScriptLoadSuccess();

    (
      component as unknown as {
        loadGoogleAnalyticsWithTrackingDisabled: () => void;
      }
    ).loadGoogleAnalyticsWithTrackingDisabled();

    expect(mockScriptLoaderService.loadScript).toHaveBeenCalled();
    expect(enableSpy).toHaveBeenCalled();
  });

  it('should log an error when Google Analytics script fails to load', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockScriptLoadFailure();

    (
      component as unknown as {
        loadGoogleAnalyticsWithTrackingDisabled: () => void;
      }
    ).loadGoogleAnalyticsWithTrackingDisabled();

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load Google Analytics script',
    );

    errorSpy.mockRestore();
  });

  it('should send page view event when gtag is available', () => {
    const gtagMock = jest.fn();
    (globalThis as unknown as { gtag?: typeof gtagMock }).gtag = gtagMock;

    (
      component as unknown as { sendPageView: (url: string) => void }
    ).sendPageView('/some-url');

    expect(gtagMock).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/some-url',
    });
  });

  it('should log error when sending page view without gtag', () => {
    (globalThis as unknown as { gtag: undefined }).gtag = undefined;

    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    (
      component as unknown as { sendPageView: (url: string) => void }
    ).sendPageView('/no-gtag');

    expect(errorSpy).toHaveBeenCalledWith('Google Analytics not available');
  });

  it('should load and disable LogRocket tracking appropriately', () => {
    (component as unknown as { loadLogRocket: () => void }).loadLogRocket();
    expect(mockLogRocketService.init).toHaveBeenCalled();

    (
      component as unknown as { disableLogRocket: () => void }
    ).disableLogRocket();
    expect(mockLogRocketService.shutdown).toHaveBeenCalled();
  });

  it('should clean up subscriptions and countdown on destroy', () => {
    const stopCountdownSpy = jest.spyOn(
      component as unknown as { stopCountdown: () => void },
      'stopCountdown',
    );

    component.ngOnDestroy();

    expect(stopCountdownSpy).toHaveBeenCalled();
  });
});
