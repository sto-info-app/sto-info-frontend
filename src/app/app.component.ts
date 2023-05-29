import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { RefreshSessionDialogComponent } from './shared/components/refresh-session-dialog/refresh-session-dialog.component';
import { APP_ROUTES } from './shared/constants/app-routing.constants';
import { DebuggingService } from './shared/services/debugging.service';
import { GeneralThemeService } from './shared/services/general-theme.service';
import { RoutingService } from './shared/services/routing.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('scrollTopButton')
  scrollTopButton!: ElementRef;

  appTitle = environment.appTitle;
  appTitleTestTag = '';
  appVersion = environment.version;
  appRoutes = APP_ROUTES;
  appDebugging = false;

  isLoggedIn = false;
  autoLogoutCountdown = 0;
  currentYear: number;
  showScrollTop = false;

  dataCascade: string;
  themePanel2RandomText: string;
  themePanel6RandomText: string;

  private warningSubscription: Subscription | undefined;
  private expirySubscription: Subscription | undefined;
  private intervalId: number | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;

  constructor(
    @Inject('API_URL') private apiUrl: string,

    private routingService: RoutingService,
    private debuggingService: DebuggingService,
    private authService: AuthService,
    private generalThemeService: GeneralThemeService,

    private titleService: Title,

    private http: HttpClient,
    private renderer: Renderer2,
    private el: ElementRef,

    public dialog: MatDialog,
    private zone: NgZone,
  ) {
    // Tags to add to titles to help identify the environment in use
    if (environment.env_name === 'local') this.appTitleTestTag = ' [Local Dev]';
    if (environment.env_name === 'dev') this.appTitleTestTag = ' [Dev]';

    // Check debugging mode
    this.appDebugging = this.debuggingService.allowDebugging();

    this.titleService.setTitle(
      (environment.appTitle
        ? environment.appTitle
        : 'Star Trek Online Info Portal') + this.appTitleTestTag,
    );
    this.currentYear = new Date().getFullYear();
    this.dataCascade = this.generalThemeService.createDynamicDataCascade();
    this.themePanel2RandomText =
      this.generalThemeService.createDynamicSideColumnText();
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.startCountdown();
    });

    // Subscribe to the warningAnnounced$ Observable - display of auto logout warning message
    this.warningSubscription = this.authService.warningAnnounced$.subscribe(
      (warningTime: number) => {
        const delay = warningTime - Date.now(); // calculate the delay in milliseconds
        if (delay > 0) {
          setTimeout(() => {
            this.openRefreshSessionDialog();
          }, delay);
        }
      },
    );

    // Subscribe to the expiryAnnounced$ Observable - auto logout
    this.expirySubscription = this.authService.expiryAnnounced$.subscribe(
      expiryTime => {
        if (expiryTime !== 0 && Date.now() >= expiryTime) {
          this.authService.performLogout();
        } else if (
          expiryTime !== 0 &&
          Date.now() < expiryTime &&
          !this.intervalId
        ) {
          this.startCountdown();
        }
      },
    );
  }

  ngAfterViewInit() {
    window.addEventListener('scroll', () => {
      this.toggleScrollTopButton();
    });
  }

  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    this.warningSubscription?.unsubscribe();
    this.expirySubscription?.unsubscribe();
  }

  toggleScrollTopButton() {
    if (window.pageYOffset > 100) {
      this.scrollTopButton.nativeElement.style.display = 'block';
    } else {
      this.scrollTopButton.nativeElement.style.display = 'none';
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout(): void {
    this.authService.performLogout();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  openRefreshSessionDialog() {
    // If a dialog box is already open, do nothing
    if (this.dialogRef) {
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
    this.zone.run(() => {
      this.intervalId = window.setInterval(() => {
        this.autoLogoutCountdown =
          this.authService.getSecondsUntilLoginSessionExpiry();
        if (this.autoLogoutCountdown <= 0) {
          if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }

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
}
