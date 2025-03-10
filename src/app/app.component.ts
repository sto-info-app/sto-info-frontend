import { Component, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { CookieService } from './shared/services/cookie.service';

declare let ga: (
  command: string,
  ...fields: (string | number | boolean | object)[]
) => void;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly cookieYesScriptId = 'cookieyes';
  private readonly cookieYesCookieName = 'cookieyes-consent';

  isLoggedIn = false;
  autoLogoutCountdown = 0;

  showScrollButton = false;

  destroy$ = new Subject<void>();
  warningSubscription: Subscription | undefined;
  expirySubscription: Subscription | undefined;
  private intervalId: number | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;

  cookieStatus = false;

  constructor(
    private readonly authService: AuthService,
    private readonly titleService: Title,
    private readonly cookieService: CookieService,
    private readonly zone: NgZone,
    private readonly renderer: Renderer2,
    private readonly router: Router,
    public readonly dialog: MatDialog,
  ) {
    this.setAppTitle();

    this.logout = this.logout.bind(this);
  }

  ngOnInit() {
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

    // Subscribe to the warningAnnounced$ Observable - display of auto logout warning message
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

    // Subscribe to the expiryAnnounced$ Observable - auto logout
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

    this.loadGoogleAnalyticsWithTrackingDisabled();
    this.loadCookieYesScript();

    // // Track page views
    // this.router.events
    //   .pipe(
    //     filter(event => event instanceof NavigationEnd),
    //     takeUntil(this.destroy$),
    //   )
    //   .subscribe((event: NavigationEnd) => {
    //     this.trackPageView(event.urlAfterRedirects);
    //   });

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

  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.stopCountdown();
    this.authService.performLogout();
  }

  openRefreshSessionDialog() {
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

  startCountdown(): void {
    if (!this.isLoggedIn || this.intervalId !== null) {
      return;
    }

    this.zone.run(() => {
      this.intervalId = window.setInterval(() => {
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

  stopCountdown(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.autoLogoutCountdown = 0;
    }
  }

  setAppTitle() {
    // Tags to add to titles to help identify the environment in use
    let appTitleTestTag = '';
    if (environment.env_name === 'local') appTitleTestTag = ' [Local Dev]';
    if (environment.env_name === 'dev') appTitleTestTag = ' [Dev]';

    this.titleService.setTitle(
      (environment.appTitle
        ? environment.appTitle
        : 'Star Trek Online Info Portal') + appTitleTestTag,
    );
  }

  /***
   * Load the CookieYes script to handle cookie consent
   * NOTE: This script is only loaded if the environment is not on localhost
   */
  loadCookieYesScript(): void {
    const consentCookieValues =
      this.cookieService.readCookie(this.cookieYesCookieName)?.split(',') || [];
    this.extractAcceptedConsentCookieCategories(consentCookieValues);

    // Clean up any existing script before loading a new one
    const existingScript = document.getElementById(this.cookieYesScriptId);
    if (existingScript) {
      existingScript.parentNode?.removeChild(existingScript);
    }

    if (environment.cookieYesUrl) {
      const script = this.renderer.createElement('script');
      script.type = 'text/javascript';
      script.src = environment.cookieYesUrl;
      script.id = this.cookieYesScriptId; // Prevent duplicate loading
      script.async = true;

      this.renderer.appendChild(document.head, script);

      script.onload = () => {
        if ((window as { CookieYes?: { run: () => void } }).CookieYes) {
          (window as { CookieYes?: { run: () => void } }).CookieYes?.run(); // Trigger manual load
        }

        // Listen for the cookie consent update event
        document.addEventListener('cookieyes_consent_update', eventData => {
          const data = (eventData as CustomEvent).detail;
          this.cookieService.setUserAcceptedCookieCategories(data.accepted); // Save the accepted cookie categories allowed by the user

          // Check if the user has accepted the analytics category since the user has changed their consent
          this.checkCookieConsentState();
        });

        // Check cookie consent state on load
        this.checkCookieConsentState();
      };

      script.onerror = () => {
        console.error('Failed to load CookieYes script');
      };
    } else {
      console.error('CookieYes URL not set in environment');
    }
  }

  checkCookieConsentState(): void {
    if (this.hasUserConsentedToAnalytics()) {
      this.consentGiven();
    } else {
      this.consentDenied();
    }
  }

  hasUserConsentedToAnalytics(): boolean {
    return this.cookieService.isCookieCategoryAccepted('analytics');
  }

  consentGiven(): void {
    console.log('Consent IS given — loading tracking scripts...');
    this.enableGoogleAnalyticsTracking();
    // this.loadLogRocket();
  }

  consentDenied(): void {
    console.log('Consent IS NOT given — disabling tracking...');
    this.disableGoogleAnalyticsTracking();
    // this.disableLogRocket();
  }

  private enableGoogleAnalyticsTracking(): void {
    // Remove the disable flag
    (window as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = false;

    // Send an initial page view.
    if (
      typeof (
        window as {
          gtag?: (
            event: string,
            action: string,
            params: { page_path: string },
          ) => void;
        }
      )['gtag'] === 'function'
    ) {
      (
        window as unknown as {
          gtag: (
            event: string,
            action: string,
            params: { page_path: string },
          ) => void;
        }
      ).gtag('event', 'page_view', {
        page_path: window.location.pathname,
      });
      console.log('GA tracking enabled and initial pageview sent.');
    }
  }

  private disableGoogleAnalyticsTracking(): void {
    // Set the global flag to true so GA stops sending events.
    (window as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = true;

    // update GA configuration to ensure no page view is sent.
    (window as { dataLayer?: unknown[] })['dataLayer']?.push([
      'config',
      environment.gaMeasurementId,
      { send_page_view: false },
    ]);
    console.log('GA tracking disabled.');
  }

  private loadGoogleAnalyticsWithTrackingDisabled(): void {
    // Disable GA tracking by default using the global flag
    (window as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = true;

    // Create the GA script element
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaMeasurementId}`;
    document.head.appendChild(script);

    // Once the script loads, initialize GA without sending page views automatically
    script.onload = () => {
      (window as { dataLayer?: unknown[] })['dataLayer'] =
        (window as { dataLayer?: unknown[] })['dataLayer'] || [];

      // Assign gtag to the window object so it's globally accessible.
      (window as unknown as { gtag?: (...args: unknown[]) => void })['gtag'] =
        function (...args: unknown[]) {
          if ((window as { dataLayer?: unknown[] })['dataLayer']) {
            (window as { dataLayer?: unknown[] })['dataLayer']?.push(args);
          }
        };

      // Initialize GA, disabling automatic page view tracking.
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        'js',
        new Date(),
      );
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        'config',
        environment.gaMeasurementId,
        {
          send_page_view: false,
        },
      );
      console.log(
        'Google Analytics loaded and initialized with tracking disabled.',
      );
    };

    console.log('GA script injected into the page.');
  }

  // disableGoogleAnalytics(): void {
  //   console.log('Disabling Google Analytics...');
  //   // Prevent GA from tracking
  //   (window as unknown as { [key: string]: boolean })[
  //     `ga-disable-${environment.gaMeasurementId}`
  //   ] = true;
  // }

  // trackPageView(url: string): void {
  //   if ((window as { gtag?: (...args: unknown[]) => void }).gtag) {
  //     const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
  //     if (gtag) {
  //       gtag('config', environment.gaMeasurementId, {
  //         page_path: url,
  //       });
  //       console.log(`Tracked page view: ${url}`);
  //     } else {
  //       console.warn('gtag function not available');
  //     }
  //   } else {
  //     console.warn('gtag function not available');
  //   }
  // }

  private sendPageView(url: string): void {
    const gtag = (
      window as {
        gtag?: (
          event: string,
          action: string,
          params: { page_path: string },
        ) => void;
      }
    ).gtag;
    console.log('gtag:', gtag);
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', { page_path: url });
      console.log('GA pageview sent for', url);
    } else {
      console.error('Google Analytics not available');
    }
  }

  extractAcceptedConsentCookieCategories(cookieValues: string[]) {
    const acceptedCategories: string[] = [];

    cookieValues.forEach(cookieValue => {
      const [cookieCategory, consentValue] = cookieValue.split(':');
      if (
        consentValue === 'yes' &&
        !['consentid', 'consent', 'action'].includes(cookieCategory) // Ignore non-category values
      ) {
        acceptedCategories.push(cookieCategory);
      }
    });

    if (acceptedCategories.length) {
      this.cookieService.setUserAcceptedCookieCategories(acceptedCategories);
    }
  }

  // loadLogRocket(): void {
  //   if (
  //     !(window as { LogRocket?: { init: (id: string) => void } })['LogRocket']
  //   ) {
  //     import('logrocket').then(LogRocket => {
  //       LogRocket.default.init('your-app-id'); // Replace with LogRocket ID
  //       console.log('LogRocket loaded');
  //     });
  //   }
  // }

  // disableLogRocket(): void {
  //   console.log('Disabling LogRocket...');
  //   if (window['LogRocket']) {
  //     window['LogRocket'].shutdown(); // Stop LogRocket session recording
  //   }
  // }
}
