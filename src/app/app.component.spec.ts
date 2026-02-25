import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { CookieService } from './shared/services/cookie.service';
import { LogRocketService } from './shared/services/log-rocket.service';
import { PageTitleService } from './shared/services/page-title.service';
import { ScriptLoaderService } from './shared/services/script-loader.service';
import { SeoService } from './shared/services/seo.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  interface AppComponentInternals {
    isLoggedIn: boolean;
    autoLogoutCountdown: number;
    intervalId: ReturnType<typeof setInterval> | null;
    warningTimeout: ReturnType<typeof setTimeout> | null;
    dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null;
    dialog: MatDialog;
    router: Router;
    googleAnalyticsLoaded: boolean;
    openRefreshSessionDialog(): void;
    loadCookieYesScript(): void;
    loadFontAwesomeKit(): void;
    consentGiven(): void;
    sendPageView(url: string | undefined): void;
    loadGoogleAnalyticsWithTrackingDisabled(): void;
    subscribeToExpiryAnnouncements(): void;
    startCountdown(): void;
    subscribeToWarningAnnouncements(): void;
    subscribeToAuthenticationState(): void;
    stopCountdown(): void;
    checkCookieConsentState(): void;
  }

  let mockAuthService: {
    isAuthenticated$: Subject<boolean>;
    warningAnnounced$: Subject<number>;
    expiryAnnounced$: Subject<number>;
    performLogout: jest.Mock<void, []>;
    refreshToken: jest.Mock<Observable<boolean>, []>;
    getSecondsUntilLoginSessionExpiry: jest.Mock<number, []>;
  };

  let mockCookieService: {
    readCookie: jest.Mock<string | undefined, [string]>;
    setUserAcceptedCookieCategories: jest.Mock<void, [string[]]>;
    isCookieCategoryAccepted: jest.Mock<boolean, [string]>;
  };

  let mockLogRocketService: {
    init: jest.Mock<void, []>;
    shutdown: jest.Mock<void, []>;
  };
  let mockPageTitleService: { init: jest.Mock<void, []> };
  let mockSeoService: { init: jest.Mock<void, []> };
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
    closeAll: jest.Mock<void, []>;
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

    mockSeoService = {
      init: jest.fn(),
    };

    mockScriptLoaderService = {
      loadScript: jest.fn(),
      shouldDisableAnalytics: jest.fn().mockReturnValue(false),
    };

    mockDialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of(true),
        close: () => {},
      }),
      closeAll: jest.fn(),
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
        { provide: SeoService, useValue: mockSeoService },
        { provide: ScriptLoaderService, useValue: mockScriptLoaderService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    })
      .overrideComponent(AppComponent, {
        set: {
          template: '',
          providers: [{ provide: MatDialog, useValue: mockDialog }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create the app and initialise the page title service', () => {
    expect(component).toBeTruthy();
    expect(mockPageTitleService.init).toHaveBeenCalled();
    expect(mockSeoService.init).toHaveBeenCalled();
  });

  it('should update login state and start countdown when authenticated', () => {
    runWithPatchedTimer('setInterval', () => {
      mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(0);
      const closeAllSpy = jest
        .spyOn(
          (component as unknown as { dialog: MatDialog }).dialog,
          'closeAll',
        )
        .mockImplementation(() => {});

      component.ngOnInit();
      mockAuthService.isAuthenticated$.next(true);

      expect(component.isLoggedIn).toBe(true);
      expect(closeAllSpy).toHaveBeenCalled();
      expect(mockAuthService.performLogout).not.toHaveBeenCalled();
    });
  });

  it('should continue countdown if autoLogoutCountdown > 0', () => {
    runWithPatchedTimer('setInterval', () => {
      mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(10);
      component.ngOnInit();
      mockAuthService.isAuthenticated$.next(true);

      expect(component.autoLogoutCountdown).toBe(10);
      expect(mockAuthService.performLogout).not.toHaveBeenCalled();
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

    const originalClearTimeout = globalThis.clearTimeout;
    const clearTimeoutSpy = jest.fn();
    (
      globalThis as unknown as { clearTimeout: typeof clearTimeout }
    ).clearTimeout = clearTimeoutSpy as unknown as typeof clearTimeout;

    jest
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'closeAll')
      .mockImplementation(() => {});

    (component as unknown as AppComponentInternals).warningTimeout =
      2 as unknown as ReturnType<typeof setTimeout>;
    (component as unknown as AppComponentInternals).intervalId =
      1 as unknown as ReturnType<typeof setInterval>;

    component.logout();

    expect(clearIntervalSpy).toHaveBeenCalledWith(1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(2);
    expect(mockDialog.closeAll).toHaveBeenCalled();
    expect(mockAuthService.performLogout).toHaveBeenCalled();

    (
      globalThis as unknown as { clearInterval: typeof clearInterval }
    ).clearInterval = originalClearInterval;
    (
      globalThis as unknown as { clearTimeout: typeof clearTimeout }
    ).clearTimeout = originalClearTimeout;
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
  it('should handle stayLoggedIn = undefined in afterClosed', () => {
    const afterClosed$ = of(undefined);
    const dialogRefMock = {
      afterClosed: jest.fn().mockReturnValue(afterClosed$),
      close: jest.fn(),
    } as unknown as MatDialogRef<RefreshSessionDialogComponent>;

    jest
      .spyOn((component as unknown as AppComponentInternals).dialog, 'open')
      .mockReturnValue(dialogRefMock);

    (component as unknown as AppComponentInternals).isLoggedIn = true;
    (component as unknown as AppComponentInternals).autoLogoutCountdown = 30;
    (component as unknown as AppComponentInternals).openRefreshSessionDialog();

    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should not load CookieYes script in ngOnInit if local env', () => {
    (environment as { env_name: string }).env_name = 'local';
    jest.spyOn(
      component as unknown as AppComponentInternals,
      'loadCookieYesScript',
    );
    component.ngOnInit();
    expect(
      (component as unknown as AppComponentInternals).loadCookieYesScript,
    ).not.toHaveBeenCalled();
  });

  it('should not load CookieYes script if cookieYesUrl is missing', () => {
    (environment as { cookieYesUrl: string | undefined }).cookieYesUrl =
      undefined;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (component as unknown as AppComponentInternals).loadCookieYesScript();
    expect(consoleSpy).toHaveBeenCalledWith(
      'CookieYes URL not set in environment',
    );
    consoleSpy.mockRestore();
  });

  it('should not load Font Awesome Kit script if fontAwesomeKitId is missing', () => {
    const originalFontAwesomeKitId = environment.fontAwesomeKitId;

    try {
      (environment as { fontAwesomeKitId?: string }).fontAwesomeKitId =
        undefined;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      (component as unknown as AppComponentInternals).loadFontAwesomeKit();

      expect(warnSpy).toHaveBeenCalledWith(
        'Font Awesome Kit ID not set in environment',
      );
      expect(mockScriptLoaderService.loadScript).not.toHaveBeenCalled();
    } finally {
      (environment as { fontAwesomeKitId?: string }).fontAwesomeKitId =
        originalFontAwesomeKitId;
    }
  });

  it('should log an error if the Font Awesome Kit script fails to load', () => {
    const originalFontAwesomeKitId = environment.fontAwesomeKitId;

    try {
      (environment as { fontAwesomeKitId?: string }).fontAwesomeKitId = 'TEST';

      mockScriptLoadFailure();
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (component as unknown as AppComponentInternals).loadFontAwesomeKit();

      expect(mockScriptLoaderService.loadScript).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'font-awesome-kit',
          src: 'https://kit.fontawesome.com/TEST.js',
          async: false,
          attributes: {
            crossorigin: 'anonymous',
          },
        }),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load Font Awesome Kit script',
      );
    } finally {
      (environment as { fontAwesomeKitId?: string }).fontAwesomeKitId =
        originalFontAwesomeKitId;
    }
  });

  it('should not perform consent actions if local env', () => {
    (environment as { env_name: string }).env_name = 'local';
    (component as unknown as AppComponentInternals).consentGiven();
    expect(mockScriptLoaderService.loadScript).not.toHaveBeenCalled();
  });

  it('should ignore non-NavigationEnd events', () => {
    const sendPageViewSpy = jest.spyOn(
      component as unknown as AppComponentInternals,
      'sendPageView',
    );
    const routerEvents$ = (component as unknown as AppComponentInternals).router
      .events as Subject<unknown>;
    routerEvents$.next({ id: 1, url: '/test' });
    expect(sendPageViewSpy).not.toHaveBeenCalled();
  });

  it('should handle missing CookieYes global', () => {
    (environment as { env_name: string }).env_name = 'prod';
    (environment as { cookieYesUrl: string | undefined }).cookieYesUrl =
      'https://test';
    mockScriptLoaderService.loadScript.mockImplementation(options => {
      (globalThis as unknown as { CookieYes: unknown }).CookieYes = undefined;
      options.onLoad?.();
    });
    (component as unknown as AppComponentInternals).loadCookieYesScript();
  });

  it('should handle missing dataLayer in gtag function', () => {
    (environment as { gaMeasurementId: string }).gaMeasurementId = 'G-TEST';
    mockScriptLoaderService.loadScript.mockImplementation(options => {
      options.onLoad?.();
    });
    (
      component as unknown as AppComponentInternals
    ).loadGoogleAnalyticsWithTrackingDisabled();

    // Now trigger gtag
    const globalWithGtag = globalThis as unknown as {
      dataLayer?: unknown[];
      gtag: (event: string, action: string, params?: unknown) => void;
    };
    const originalDataLayer = globalWithGtag.dataLayer;
    globalWithGtag.dataLayer = undefined;

    expect(() => {
      globalWithGtag.gtag('event', 'test');
    }).not.toThrow();

    globalWithGtag.dataLayer = originalDataLayer;
  });

  it('should handle missing dataLayer global in loadGoogleAnalyticsWithTrackingDisabled', () => {
    (environment as { gaMeasurementId: string }).gaMeasurementId = 'G-TEST';
    mockScriptLoaderService.loadScript.mockImplementation(options => {
      (globalThis as unknown as { dataLayer: unknown }).dataLayer = undefined;
      options.onLoad?.();
      // Call the gtag implementation that was set up in onLoad
      (globalThis as unknown as { gtag: (msg: string) => void }).gtag('test');
    });
    (
      component as unknown as AppComponentInternals
    ).loadGoogleAnalyticsWithTrackingDisabled();
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

    const closeAllSpy = jest
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'closeAll')
      .mockImplementation(() => {});

    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

    (
      component as unknown as { subscribeToExpiryAnnouncements: () => void }
    ).subscribeToExpiryAnnouncements();

    mockAuthService.expiryAnnounced$.next(1000);

    expect(closeAllSpy).toHaveBeenCalled();
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
      component as unknown as { subscribeToExpiryAnnouncements: () => void }
    ).subscribeToExpiryAnnouncements();

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

    const gtagMock = jest.fn();
    (globalThis as unknown as { gtag?: typeof gtagMock }).gtag = gtagMock;

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
    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'denied',
    });
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

    (environment as { gaMeasurementId: string | undefined }).gaMeasurementId =
      originalId;
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

    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);

    (
      component as unknown as { sendPageView: (url: string) => void }
    ).sendPageView('/no-gtag');

    expect(infoSpy).toHaveBeenCalledWith('Google Analytics not available');
  });

  it('should load and disable LogRocket tracking appropriately', () => {
    (component as unknown as { loadLogRocket: () => void }).loadLogRocket();
    expect(mockLogRocketService.init).toHaveBeenCalled();

    (
      component as unknown as { disableLogRocket: () => void }
    ).disableLogRocket();
    expect(mockLogRocketService.shutdown).toHaveBeenCalled();
  });

  it('should not open refresh dialog when not logged in', () => {
    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = false;
    (
      component as unknown as { autoLogoutCountdown: number }
    ).autoLogoutCountdown = 30;

    (
      component as unknown as { openRefreshSessionDialog: () => void }
    ).openRefreshSessionDialog();

    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should not open refresh dialog when countdown is zero', () => {
    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;
    (
      component as unknown as { autoLogoutCountdown: number }
    ).autoLogoutCountdown = 0;

    (
      component as unknown as { openRefreshSessionDialog: () => void }
    ).openRefreshSessionDialog();

    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should not start countdown if already running', () => {
    (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;
    (
      component as unknown as { intervalId: ReturnType<typeof setInterval> }
    ).intervalId = 1 as unknown as ReturnType<typeof setInterval>;

    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');

    (component as unknown as { startCountdown: () => void }).startCountdown();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('should close dialog when countdown expires', () => {
    const dialogRefMock = {
      close: jest.fn(),
    } as unknown as MatDialogRef<RefreshSessionDialogComponent>;

    const closeAllSpy = jest
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'closeAll')
      .mockImplementation(() => {});

    (
      component as unknown as {
        dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null;
      }
    ).dialogRef = dialogRefMock;

    mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(0);

    runWithPatchedTimer('setInterval', () => {
      (component as unknown as { isLoggedIn: boolean }).isLoggedIn = true;
      (component as unknown as { startCountdown: () => void }).startCountdown();

      expect(closeAllSpy).toHaveBeenCalled();
      expect(mockAuthService.performLogout).not.toHaveBeenCalled();
    });
  });

  it('should return early from enableGoogleAnalyticsTracking when no measurement ID', () => {
    const originalId = environment.gaMeasurementId;
    (environment as { gaMeasurementId: string }).gaMeasurementId = '';

    (
      component as unknown as { enableGoogleAnalyticsTracking: () => void }
    ).enableGoogleAnalyticsTracking();

    // Should not set any global flags
    expect(
      (globalThis as unknown as { [key: string]: boolean })['ga-disable-'],
    ).toBeUndefined();

    (environment as { gaMeasurementId: string | undefined }).gaMeasurementId =
      originalId;
  });

  it('should return early from disableGoogleAnalyticsTracking when no measurement ID', () => {
    const originalId = environment.gaMeasurementId;
    (environment as { gaMeasurementId: string }).gaMeasurementId = '';

    (
      component as unknown as { disableGoogleAnalyticsTracking: () => void }
    ).disableGoogleAnalyticsTracking();

    // Should not set any global flags
    expect(
      (globalThis as unknown as { [key: string]: boolean })['ga-disable-'],
    ).toBeUndefined();

    (environment as { gaMeasurementId: string | undefined }).gaMeasurementId =
      originalId;
  });

  it('should not reload Google Analytics if already loaded', () => {
    (environment as { gaMeasurementId: string }).gaMeasurementId =
      'G-TEST-MEASUREMENT';
    (
      component as unknown as { googleAnalyticsLoaded: boolean }
    ).googleAnalyticsLoaded = true;

    (
      component as unknown as {
        loadGoogleAnalyticsWithTrackingDisabled: () => void;
      }
    ).loadGoogleAnalyticsWithTrackingDisabled();

    expect(mockScriptLoaderService.loadScript).not.toHaveBeenCalled();
  });

  it('should track page views with setTimeout delay', () => {
    const sendPageViewSpy = jest.spyOn(
      component as unknown as { sendPageView: (url: string) => void },
      'sendPageView',
    );

    (
      component as unknown as { trackPageViewsOnNavigation: () => void }
    ).trackPageViewsOnNavigation();

    runWithPatchedTimer('setTimeout', () => {
      const event = new NavigationEnd(1, '/old', '/new');
      routerEvents$.next(event);

      expect(sendPageViewSpy).toHaveBeenCalledWith('/new');
    });
  });

  it('should enable GA tracking when already loaded', () => {
    (environment as { env_name: string }).env_name = 'test';
    (environment as { gaMeasurementId: string }).gaMeasurementId =
      'G-TEST-MEASUREMENT';
    (
      component as unknown as { googleAnalyticsLoaded: boolean }
    ).googleAnalyticsLoaded = true;

    const enableGoogleAnalyticsTrackingSpy = jest.spyOn(
      component as unknown as { enableGoogleAnalyticsTracking: () => void },
      'enableGoogleAnalyticsTracking',
    );

    (component as unknown as { consentGiven: () => void }).consentGiven();

    expect(enableGoogleAnalyticsTrackingSpy).toHaveBeenCalled();
  });

  it('should clean up subscriptions and countdown on destroy', () => {
    const stopCountdownSpy = jest.spyOn(
      component as unknown as { stopCountdown: () => void },
      'stopCountdown',
    );

    component.ngOnDestroy();

    expect(stopCountdownSpy).toHaveBeenCalled();
  });

  describe('Remaining Branch Coverage', () => {
    it('should not perform logout if not logged in on expiry announcement', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = false;
      (
        component as unknown as AppComponentInternals
      ).subscribeToExpiryAnnouncements();
      mockAuthService.expiryAnnounced$.next(1000);
      expect(mockAuthService.performLogout).not.toHaveBeenCalled();
    });

    it('should not start countdown if expiryTime is 0', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      const startCountdownSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'startCountdown',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToExpiryAnnouncements();
      mockAuthService.expiryAnnounced$.next(0);
      expect(startCountdownSpy).not.toHaveBeenCalled();
    });

    it('should not open refresh dialog if not logged in on warning announcement', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = false;
      const openRefreshSessionDialogSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'openRefreshSessionDialog',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToWarningAnnouncements();
      mockAuthService.warningAnnounced$.next(Date.now() + 1000);
      expect(openRefreshSessionDialogSpy).not.toHaveBeenCalled();
    });

    it('should not open refresh dialog if intervalId is null on warning announcement', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      (component as unknown as AppComponentInternals).intervalId = null;
      const openRefreshSessionDialogSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'openRefreshSessionDialog',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToWarningAnnouncements();
      mockAuthService.warningAnnounced$.next(Date.now() + 1000);
      expect(openRefreshSessionDialogSpy).not.toHaveBeenCalled();
    });

    it('should not open refresh dialog if delay is not positive', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      (component as unknown as AppComponentInternals).intervalId =
        1 as unknown as ReturnType<typeof setInterval>;
      const openRefreshSessionDialogSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'openRefreshSessionDialog',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToWarningAnnouncements();
      mockAuthService.warningAnnounced$.next(Date.now() - 1000);
      expect(openRefreshSessionDialogSpy).toHaveBeenCalled();
    });

    it('should not start countdown if already logged in and interval exists', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      (component as unknown as AppComponentInternals).intervalId =
        1 as unknown as ReturnType<typeof setInterval>;
      const startCountdownSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'startCountdown',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToAuthenticationState();
      mockAuthService.isAuthenticated$.next(true);
      expect(startCountdownSpy).not.toHaveBeenCalled();
    });

    it('should stop countdown if interval is not null but logged in is false', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = false;
      (component as unknown as AppComponentInternals).intervalId =
        1 as unknown as ReturnType<typeof setInterval>;
      const stopCountdownSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'stopCountdown',
      );
      (
        component as unknown as AppComponentInternals
      ).subscribeToAuthenticationState();
      mockAuthService.isAuthenticated$.next(false);
      expect(stopCountdownSpy).toHaveBeenCalled();
    });

    it('should clear existing warningTimeout when new warning announced', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      (component as unknown as AppComponentInternals).warningTimeout =
        123 as unknown as ReturnType<typeof setTimeout>;
      (component as unknown as AppComponentInternals).isLoggedIn = true;

      (
        component as unknown as AppComponentInternals
      ).subscribeToWarningAnnouncements();
      mockAuthService.warningAnnounced$.next(0);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
      expect(
        (component as unknown as AppComponentInternals).warningTimeout,
      ).toBeNull();
    });

    it('should clear warningTimeout and close dialogRef on auth state change to logged out', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      const dialogRefCloseSpy = jest.fn();
      (component as unknown as AppComponentInternals).warningTimeout =
        456 as unknown as ReturnType<typeof setTimeout>;
      (component as unknown as AppComponentInternals).dialogRef = {
        close: dialogRefCloseSpy,
      } as unknown as MatDialogRef<RefreshSessionDialogComponent>;

      (
        component as unknown as AppComponentInternals
      ).subscribeToAuthenticationState();
      mockAuthService.isAuthenticated$.next(false);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(456);
      expect(dialogRefCloseSpy).toHaveBeenCalled();
      expect(
        (component as unknown as AppComponentInternals).warningTimeout,
      ).toBeNull();
      expect(
        (component as unknown as AppComponentInternals).dialogRef,
      ).toBeNull();
    });

    it('should clear warningTimeout and close dialogRef on countdown expiry', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      const dialogRefCloseSpy = jest.fn();
      (component as unknown as AppComponentInternals).warningTimeout =
        789 as unknown as ReturnType<typeof setTimeout>;
      (component as unknown as AppComponentInternals).dialogRef = {
        close: dialogRefCloseSpy,
      } as unknown as MatDialogRef<RefreshSessionDialogComponent>;
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      mockAuthService.getSecondsUntilLoginSessionExpiry.mockReturnValue(0);

      runWithPatchedTimer('setInterval', () => {
        (component as unknown as AppComponentInternals).startCountdown();
        expect(clearTimeoutSpy).toHaveBeenCalledWith(789);
        expect(dialogRefCloseSpy).toHaveBeenCalled();
        expect(
          (component as unknown as AppComponentInternals).warningTimeout,
        ).toBeNull();
        expect(
          (component as unknown as AppComponentInternals).dialogRef,
        ).toBeNull();
      });
    });

    it('should return early from initGoogleConsentMode when no measurement ID', () => {
      const originalId = environment.gaMeasurementId;
      (environment as { gaMeasurementId: string | undefined }).gaMeasurementId =
        '';

      const ensureGtagSpy = jest.spyOn(
        component as unknown as { ensureGtag: () => void },
        'ensureGtag',
      );

      (
        component as unknown as { initGoogleConsentMode: () => void }
      ).initGoogleConsentMode();

      expect(ensureGtagSpy).not.toHaveBeenCalled();

      (environment as { gaMeasurementId: string | undefined }).gaMeasurementId =
        originalId;
    });

    it('should fall through when expiryTime is in future but interval already exists', () => {
      (component as unknown as AppComponentInternals).isLoggedIn = true;
      (component as unknown as AppComponentInternals).intervalId =
        123 as unknown as ReturnType<typeof setInterval>;
      const startCountdownSpy = jest.spyOn(
        component as unknown as AppComponentInternals,
        'startCountdown',
      );

      (
        component as unknown as AppComponentInternals
      ).subscribeToExpiryAnnouncements();
      mockAuthService.expiryAnnounced$.next(Date.now() + 10000);

      expect(startCountdownSpy).not.toHaveBeenCalled();
    });

    it('should handle logout when warningTimeout is null', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      (component as unknown as AppComponentInternals).warningTimeout = null;
      component.logout();
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });

    it('should handle missing gtag function in disableGoogleAnalyticsTracking', () => {
      (environment as { gaMeasurementId: string }).gaMeasurementId = 'G-TEST';
      const originalGtag = (globalThis as unknown as { gtag: unknown }).gtag;
      (globalThis as unknown as { gtag: undefined }).gtag = undefined;

      try {
        (
          component as unknown as { disableGoogleAnalyticsTracking: () => void }
        ).disableGoogleAnalyticsTracking();
        expect(
          (globalThis as unknown as Record<string, boolean>)[
            'ga-disable-G-TEST'
          ],
        ).toBe(true);
      } finally {
        (globalThis as unknown as { gtag: unknown }).gtag = originalGtag;
      }
    });
  });
});
