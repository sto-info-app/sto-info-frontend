import { Component, NgZone, Renderer2 } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
})
export class AppComponent {
  cookieYesScriptId = 'cookieyes';
  isLoggedIn = false;
  autoLogoutCountdown = 0;

  showScrollButton = false;

  destroy$ = new Subject<void>();
  warningSubscription: Subscription | undefined;
  expirySubscription: Subscription | undefined;
  private intervalId: number | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly titleService: Title,
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

  loadCookieYesScript(): void {
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
        console.log('CookieYes script loaded.'); //TODO: Delete me!
        if ((window as { CookieYes?: { run: () => void } }).CookieYes) {
          (window as { CookieYes?: { run: () => void } }).CookieYes?.run(); // Trigger manual load
        }
      };

      script.onerror = () => {
        console.error('Failed to load CookieYes script');
      };
    }
  }
}
