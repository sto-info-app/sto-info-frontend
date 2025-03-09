import { Component, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { CookieService } from './shared/services/cookie.service';

// /// <reference types="cookieyes" />
// declare global {
//   interface Window {
//     getCkyConsent?: () => {
//       activeLaw: string;
//       categories: {
//         necessary: boolean;
//         functional: boolean;
//         analytics: boolean;
//         performance: boolean;
//         advertisement: boolean;
//       };
//       isUserActionCompleted: boolean;
//       consentID: string;
//       languageCode: string;
//     };
//   }
// }

// function getCkyConsent() {
//   if (window.getCkyConsent) {
//     return window.getCkyConsent();
//   } else {
//     return {
//       activeLaw: '',
//       categories: {
//         necessary: false,
//         functional: false,
//         analytics: false,
//         performance: false,
//         advertisement: false,
//       },
//       isUserActionCompleted: false,
//       consentID: '',
//       languageCode: '',
//     };
//   }
// }

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

    // // Subscribe to updates on the cookie status
    // this.cookieService.cookieStatus$
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(status => {
    //     console.log('Cookie status updated:', status);
    //     this.cookieStatus = status;
    //     // Perform additional actions based on the cookie status
    //     if (status) {
    //       this.consentGiven();
    //     } else {
    //       this.consentDenied();
    //     }
    //   });

    // // Trigger an update check for the cookieYes cookie
    // this.cookieService.getSpecificCookieStatus(this.cookieYesCookieName);

    this.loadCookieYesScript();
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
    console.log('loadCookieYesScript document.cookie:', document.cookie);
    console.log('Loading CookieYes script...');

    const consentCookie = this.cookieService.readCookie(
      this.cookieYesCookieName,
    );
    if (consentCookie) {
      this.extractAcceptedConsentCookieCategories(consentCookie);
    }

    // Clean up any existing script before loading a new one
    const existingScript = document.getElementById(this.cookieYesScriptId);
    if (existingScript) {
      console.log('Removing existing CookieYes script...');
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
        console.log('CookieYes script loaded.');
        if ((window as { CookieYes?: { run: () => void } }).CookieYes) {
          (window as { CookieYes?: { run: () => void } }).CookieYes?.run(); // Trigger manual load
        }

        console.log('CookieYes script run. Listening for consent update...');
        // Listen for the cookie consent update event
        document.addEventListener('cookieyes_consent_update', eventData => {
          const data = (eventData as CustomEvent).detail;
          console.log('CookieYes consent update:', data);
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
    if (this.cookieService.isCookieCategoryAccepted('analytics')) {
      this.consentGiven();
    } else {
      this.consentDenied();
    }
  }

  // checkConsentState(): void {
  //   const consent = getCkyConsent();
  //   console.log('Checking consent state:', consent);

  //   if (consent.isUserActionCompleted && consent.categories.analytics) {
  //     this.consentGiven();
  //   } else {
  //     this.consentDenied();
  //   }
  // }

  consentGiven(): void {
    console.log('Consent IS given — loading tracking scripts...');
    this.loadGoogleAnalytics();
    // this.loadLogRocket();
  }

  consentDenied(): void {
    console.log('Consent IS NOT given — disabling tracking...');
    this.disableGoogleAnalytics();
    // this.disableLogRocket();
  }

  loadGoogleAnalytics(): void {
    if (environment.env_name !== 'local' && environment.gaMeasurementId) {
      interface WindowWithGA extends Window {
        gtag?: (...args: unknown[]) => void;
      }
      const typedWindow = window as WindowWithGA;
      if (!typedWindow.gtag) {
        const script = this.renderer.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaMeasurementId}`; // Replace with your GA ID
        script.async = true;
        this.renderer.appendChild(document.head, script);

        (window as unknown as { dataLayer: unknown[] }).dataLayer =
          (window as unknown as { dataLayer: unknown[] }).dataLayer || [];

        typedWindow.gtag = (...args: unknown[]) => {
          (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
        };

        script.onload = () => {
          if (typedWindow.gtag) {
            typedWindow.gtag('js', new Date());
            typedWindow.gtag('config', environment.gaMeasurementId, {
              anonymize_ip: true,
            });
          }
          console.log('Google Analytics loaded and initialized');
        };

        script.onerror = () => {
          console.error('Failed to load Google Analytics script');
        };
      } else {
        console.log('Google Analytics already loaded');
      }
    } else {
      console.warn('Google Analytics not loaded due to environment settings');
    }
  }

  disableGoogleAnalytics(): void {
    console.log('Disabling Google Analytics...');
    // Prevent GA from tracking
    (window as unknown as { [key: string]: boolean })[
      `ga-disable-${environment.gaMeasurementId}`
    ] = true;
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

  extractAcceptedConsentCookieCategories(cookieValue: string) {
    console.log('Extracting accepted consent cookie categories:', cookieValue);

    if (cookieValue) {
      const cookieParts = cookieValue.split(',');
      console.log('Cookie parts:', cookieParts);

      const acceptedCategories = cookieParts
        .filter(part => {
          const [key, value] = part.split(':');
          return (
            value === 'yes' && !['consentid', 'consent', 'action'].includes(key)
          );
        })
        .map(part => part.split(':')[0]);

      console.log('Accepted categories:', acceptedCategories);
      this.cookieService.setUserAcceptedCookieCategories(acceptedCategories);
    }
  }
}
