import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { CookieService } from './shared/services/cookie.service';
import { LogRocketService } from './shared/services/log-rocket.service';
import { PageTitleService } from './shared/services/page-title.service';
import { ScriptLoaderService } from './shared/services/script-loader.service';
import { HeaderComponent } from './template/header/header.component';
import { MainContentComponent } from './template/main-content/main-content.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [HeaderComponent, MainContentComponent, MatDialogModule],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly cookieYesScriptId = 'cookieyes';
  private readonly cookieYesCookieName = 'cookieyes-consent';
  private googleAnalyticsLoaded = false;

  isLoggedIn = false;
  autoLogoutCountdown = 0;
  showScrollButton = false;

  destroy$ = new Subject<void>();
  warningSubscription: Subscription | undefined;
  expirySubscription: Subscription | undefined;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;
  private readonly authService = inject(AuthService);
  private readonly logRocketService = inject(LogRocketService);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly cookieService = inject(CookieService);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly scriptLoader = inject(ScriptLoaderService);
  public readonly dialog = inject(MatDialog);

  /**
   * Initialises the AppComponent, sets up page title service and scroll to top on route change.
   * @returns void
   */
  constructor() {
    this.pageTitleService.init();
    this.resetScrollPositionOnNavigationEnd();
    this.logout = this.logout.bind(this);
  }

  /**
   * Initialises the component, sets up subscriptions for authentication state,
   * warning and expiry announcements, and loads necessary scripts.
   * @returns void
   */
  ngOnInit() {
    this.subscribeToAuthenticationState();
    this.subscribeToWarningAnnouncements();
    this.subscribeTExpiryAnnouncements();

    if (environment?.env_name !== 'local') {
      this.loadCookieYesScript();
      this.trackPageViewsOnNavigation();
    }
  }

  /**
   * Subscribes to expiry announcements from AuthService to handle auto-logout for the display of auto logout
   * @returns void
   * @remarks Subscribe to the expiryAnnounced$ Observable to handle auto-logout when the session expires.
   */
  private subscribeTExpiryAnnouncements() {
    this.expirySubscription = this.authService.expiryAnnounced$
      .pipe(takeUntil(this.destroy$))
      .subscribe(expiryTime => {
        if (this.isLoggedIn) {
          if (expiryTime !== 0 && Date.now() >= expiryTime) {
            this.authService.performLogout();
          } else if (
            expiryTime !== 0 &&
            Date.now() < expiryTime &&
            !this.intervalId
          ) {
            this.startCountdown();
          }
        }
      });
  }

  /**
   * Subscribes to warning announcements from AuthService to handle display of auto logout warning message
   * @returns void
   * @remarks Subscribe to the warningAnnounced$ Observable to handle display of auto-logout warning message.
   */
  private subscribeToWarningAnnouncements() {
    this.warningSubscription = this.authService.warningAnnounced$
      .pipe(takeUntil(this.destroy$))
      .subscribe((warningTime: number) => {
        if (this.isLoggedIn && this.intervalId !== null) {
          const delay = warningTime - Date.now(); // calculate the delay in milliseconds
          if (delay > 0) {
            setTimeout(() => {
              this.openRefreshSessionDialog();
            }, delay);
          }
        }
      });
  }

  /**
   * Subscribes to authentication state changes from AuthService
   * to manage auto-logout countdown timer
   * @returns void
   * @remarks Subscribes to the isAuthenticated$ Observable to start/stop the countdown timer based on login state.
   */
  private subscribeToAuthenticationState() {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loggedIn => {
        this.isLoggedIn = loggedIn;
        if (this.isLoggedIn && this.intervalId === null) {
          this.startCountdown();
        } else if (!this.isLoggedIn && this.intervalId !== null) {
          this.stopCountdown();
        }
      });
  }

  /**
   * Tracks page views on navigation end events for Google Analytics
   * @returns void
   * @remarks Subscribes to the Router's navigation end events and sends page view events to Google Analytics.
   */
  private trackPageViewsOnNavigation() {
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Delay the GA call slightly if needed to ensure GA has fully loaded
        setTimeout(() => {
          this.sendPageView(event.urlAfterRedirects);
        }, 0);
      });
  }

  /**
   * Cleans up subscriptions and intervals on component destroy
   * @returns void
   */
  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    this.destroy$.next();
    this.destroy$.complete();

    // Ensure any active countdown interval is cleared on destroy
    this.stopCountdown();
  }

  /**
   * Logs out the user immediately
   * Stops the countdown and performs logout via AuthService
   * @returns void
   */
  logout(): void {
    this.stopCountdown();
    this.authService.performLogout();
  }

  /**
   * Opens the refresh session dialog to warn the user of impending logout
   * @returns void
   */
  private openRefreshSessionDialog(): void {
    // If a dialog box is already open, do nothing
    if (this.dialogRef) {
      return;
    }

    // If the countdown has ended, do nothing
    if (!this.autoLogoutCountdown || this.autoLogoutCountdown <= 0) {
      return;
    }

    if (!this.isLoggedIn) {
      return;
    }

    // Open a warning dialog
    this.dialogRef = this.dialog.open(RefreshSessionDialogComponent, {
      hasBackdrop: true,
      data: { appComponent: this },
    });

    // Handle the result (if any action needed)
    this.dialogRef.afterClosed().subscribe((stayLoggedIn = false) => {
      if (stayLoggedIn) {
        this.authService.refreshToken().subscribe();
      }

      // Allow opening the dialog box again
      this.dialogRef = null;
    });
  }

  /**
   * Starts the auto-logout countdown timer
   * @returns void
   */
  private startCountdown(): void {
    if (!this.isLoggedIn || this.intervalId !== null) {
      return;
    }

    this.zone.run(() => {
      this.intervalId = globalThis.setInterval(() => {
        this.autoLogoutCountdown =
          this.authService.getSecondsUntilLoginSessionExpiry();
        if (this.autoLogoutCountdown <= 0) {
          this.stopCountdown();

          // If the warning dialog is open
          if (this.dialogRef) {
            this.dialogRef.close(); // Close the dialog
            this.dialogRef = null; // Allow opening the dialog box again
          }

          this.authService.performLogout();
        }
      }, 1000);
    });
  }

  /**
   * Stops the auto-logout countdown timer
   * @returns void
   */
  private stopCountdown(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.autoLogoutCountdown = 0;
    }
  }

  /***
   * Load the CookieYes script to handle cookie consent
   */
  private loadCookieYesScript(): void {
    const consentCookieValues =
      this.cookieService.readCookie(this.cookieYesCookieName)?.split(',') || [];
    this.extractAcceptedConsentCookieCategories(consentCookieValues);

    if (!environment?.cookieYesUrl) {
      console.error('CookieYes URL not set in environment');
      return;
    }

    this.scriptLoader.loadScript({
      id: this.cookieYesScriptId,
      src: environment?.cookieYesUrl,
      async: true,
      onLoad: () => {
        if ((globalThis as { CookieYes?: { run: () => void } }).CookieYes) {
          (globalThis as { CookieYes?: { run: () => void } }).CookieYes?.run();
        }

        document.addEventListener('cookieyes_consent_update', eventData => {
          const data = (eventData as CustomEvent).detail;
          this.cookieService.setUserAcceptedCookieCategories(data.accepted);
          this.checkCookieConsentState();
        });

        this.checkCookieConsentState();
      },
      onError: () => {
        console.error('Failed to load CookieYes script');
      },
    });
  }

  /**
   * Checks the user's cookie consent state and enables/disables analytics accordingly
   * @returns void
   */
  private checkCookieConsentState(): void {
    if (
      !this.scriptLoader.shouldDisableAnalytics() &&
      this.hasUserConsentedToAnalytics()
    ) {
      this.consentGiven();
    } else {
      this.consentDenied();
    }
  }

  /**
   * Checks if the user has consented to analytics cookies
   * @returns boolean - true if consented, false otherwise
   */
  private hasUserConsentedToAnalytics(): boolean {
    return this.cookieService.isCookieCategoryAccepted('analytics');
  }

  /**
   * Handles actions to take when user gives cookie consent
   * @returns void
   */
  private consentGiven(): void {
    if (environment?.env_name !== 'local') {
      if (this.googleAnalyticsLoaded) {
        this.enableGoogleAnalyticsTracking();
      } else {
        this.loadGoogleAnalyticsWithTrackingDisabled();
      }
      this.loadLogRocket();
    }
  }

  /**
   * Handles actions to take when user denies cookie consent
   * @returns void
   */
  private consentDenied(): void {
    this.disableGoogleAnalyticsTracking();
    this.disableLogRocket();
  }

  /**
   * Enables Google Analytics tracking
   * @returns void
   */
  private enableGoogleAnalyticsTracking(): void {
    if (!environment?.gaMeasurementId) {
      return;
    }

    // Remove the disable flag
    (globalThis as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = false;

    // Send an initial page view.
    const globalWithGtag = globalThis as unknown as {
      gtag?: (
        event: string,
        action: string,
        params: { page_path: string },
      ) => void;
      location: Location;
    };

    if (typeof globalWithGtag.gtag === 'function') {
      globalWithGtag.gtag('event', 'page_view', {
        page_path: globalWithGtag.location.pathname,
      });
    }

    // Log the current page
    this.sendPageView(globalWithGtag.location.pathname);
  }

  /**
   * Disables Google Analytics tracking
   * @returns void
   */
  private disableGoogleAnalyticsTracking(): void {
    if (!environment?.gaMeasurementId) {
      return;
    }

    // Set the global flag to true so GA stops sending events.
    (globalThis as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = true;

    // update GA configuration to ensure no page view is sent.
    (globalThis as { dataLayer?: unknown[] })['dataLayer']?.push([
      'config',
      environment.gaMeasurementId,
      { send_page_view: false },
    ]);
  }

  /**
   * Loads the Google Analytics script and enables tracking once loaded
   * @returns void
   */
  private loadGoogleAnalyticsWithTrackingDisabled(): void {
    if (!environment?.gaMeasurementId) {
      console.warn('Google Analytics measurement ID not set; skipping load.');
      return;
    }

    if (this.googleAnalyticsLoaded) {
      return;
    }

    this.googleAnalyticsLoaded = true;

    this.scriptLoader.loadScript({
      id: 'ga-script',
      src: `https://www.googletagmanager.com/gtag/js?id=${environment?.gaMeasurementId}`,
      async: true,
      attributes: { crossorigin: 'anonymous' },
      onLoad: () => {
        (globalThis as { dataLayer?: unknown[] })['dataLayer'] =
          (globalThis as { dataLayer?: unknown[] })['dataLayer'] || [];

        (globalThis as unknown as { gtag?: (...args: unknown[]) => void })[
          'gtag'
        ] = function (...args: unknown[]) {
          if ((globalThis as { dataLayer?: unknown[] })['dataLayer']) {
            (globalThis as { dataLayer?: unknown[] })['dataLayer']?.push(args);
          }
        };

        (globalThis as unknown as { gtag: (...args: unknown[]) => void }).gtag(
          'js',
          new Date(),
        );
        (globalThis as unknown as { gtag: (...args: unknown[]) => void }).gtag(
          'config',
          environment.gaMeasurementId,
          {
            send_page_view: false,
          },
        );

        this.enableGoogleAnalyticsTracking();
      },
      onError: () => {
        console.error('Failed to load Google Analytics script');
      },
    });
  }

  /**
   * Sends a page view event to Google Analytics
   * @param url The URL of the page to send a view event for
   */
  private sendPageView(url: string): void {
    const gtag = (
      globalThis as {
        gtag?: (
          event: string,
          action: string,
          params: { page_path: string },
        ) => void;
      }
    ).gtag;
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', { page_path: url });
    } else {
      console.error('Google Analytics not available');
    }
  }

  /**
   * Extracts accepted cookie categories from CookieYes consent cookie values
   * @param cookieValues Array of cookie consent values
   * @returns void
   */
  private extractAcceptedConsentCookieCategories(cookieValues: string[]) {
    const acceptedCategories: string[] = [];

    for (const cookieValue of cookieValues) {
      const [cookieCategory, consentValue] = cookieValue.split(':');
      if (
        consentValue === 'yes' &&
        !['consentid', 'consent', 'action'].includes(cookieCategory) // Ignore non-category values
      ) {
        acceptedCategories.push(cookieCategory);
      }
    }

    if (acceptedCategories.length) {
      this.cookieService.setUserAcceptedCookieCategories(acceptedCategories);
    }
  }

  /**
   * Loads LogRocket if user has consented to analytics cookies
   * @returns void
   */
  private loadLogRocket(): void {
    this.logRocketService.init();
  }

  /**
   * Disables LogRocket tracking
   * @returns void
   */
  private disableLogRocket(): void {
    this.logRocketService.shutdown();
  }

  /**
   * Resets the scroll position to the top on navigation end events
   * @returns void
   * @remarks
   * This method subscribes to the Router's navigation end events and sets the scroll position to the top of the page.
   * It uses a timeout to ensure the scroll occurs after the navigation has fully completed.
   * This fix was added to scroll to top on route change to avoid retaining scroll position from previous route.
   */
  private resetScrollPositionOnNavigationEnd() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          globalThis.scrollTo?.({ top: 0, behavior: 'auto' });
        }, 0);
      });
  }
}
