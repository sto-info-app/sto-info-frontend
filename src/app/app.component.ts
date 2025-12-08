import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
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

  isLoggedIn = false;
  autoLogoutCountdown = 0;

  showScrollButton = false;

  destroy$ = new Subject<void>();
  warningSubscription: Subscription | undefined;
  expirySubscription: Subscription | undefined;
  private intervalId: number | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;
  private readonly authService = inject(AuthService);
  private readonly logRocketService = inject(LogRocketService);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly cookieService = inject(CookieService);
  private readonly zone = inject(NgZone);
  private readonly renderer = inject(Renderer2);
  private readonly router = inject(Router);
  public readonly dialog = inject(MatDialog);

  constructor() {
    this.pageTitleService.init();

    //NOTE: Added fix to scroll to top on route change to avoid retaining scroll position from previous route
    router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }, 0);
      });

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

    // Ensure any active countdown interval is cleared on destroy
    this.stopCountdown();
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
    this.enableGoogleAnalyticsTracking();
    this.loadLogRocket();
  }

  consentDenied(): void {
    this.disableGoogleAnalyticsTracking();
    this.disableLogRocket();
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
    }

    // Log the current page
    this.sendPageView(window.location.pathname);
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
    };
  }

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
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', { page_path: url });
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

  loadLogRocket(): void {
    this.logRocketService.init();
  }

  disableLogRocket(): void {
    this.logRocketService.shutdown();
  }
}
