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
  dataCascade: string;
  showScrollTop = false;
  sideColumnRandomTextItems: string[] = [];
  maxNumberOfSideColumnRandomTextItems = 5;

  private warningSubscription: Subscription | undefined;
  private expirySubscription: Subscription | undefined;
  private intervalId: number | null = null;

  private dialogRef: MatDialogRef<RefreshSessionDialogComponent> | null = null;

  constructor(
    @Inject('API_URL') private apiUrl: string,

    private routingService: RoutingService,
    private debuggingService: DebuggingService,
    private authService: AuthService,
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
    this.dataCascade = this.createDynamicDataCascade(8, 7, 3, 6);
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

    this.populateSideColumnRandomTextItems();
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

  populateSideColumnRandomTextItems(): void {
    for (let i = 0; i < this.maxNumberOfSideColumnRandomTextItems; i++) {
      this.sideColumnRandomTextItems.push(this.createDynamicSideColumnText());
    }
  }

  randomCharacter(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return characters.charAt(Math.floor(Math.random() * characters.length));
  }

  generateRandomValue(minChars: number, maxChars: number): string {
    const numbers = '0123456789';
    const special = ' -';
    let value = '';

    const length =
      Math.floor(Math.random() * (maxChars - minChars + 1)) + minChars;
    const numLetters = Math.floor(Math.random() * Math.min(3, length + 1)); // 0 to 2 letters, but not more than the length
    const numNumbers = length - numLetters;

    for (let i = 0; i < numLetters; i++) {
      value += this.randomCharacter();
    }

    for (let i = 0; i < numNumbers; i++) {
      value += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Add space or hyphen with a 1 in 20 chance, but not for the first or last character
    if (length >= 3 && Math.random() < 1 / 20) {
      const specialIndex = Math.floor(Math.random() * (length - 3)) + 1;
      value =
        value.slice(0, specialIndex) +
        special.charAt(Math.floor(Math.random() * special.length)) +
        value.slice(specialIndex);
    }

    // Shuffle the characters in the value to mix letters and numbers
    value = value
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    return value;
  }

  createDynamicDataCascade(
    rows: number,
    itemsPerRow: number,
    minChars: number,
    maxChars: number,
  ): string {
    let html = '';

    for (let i = 1; i <= rows; i++) {
      html += `<div class="row-${i}">`;
      for (let j = 1; j <= itemsPerRow; j++) {
        const value = this.generateRandomValue(minChars, maxChars);
        html += `<div class="dc${j}">${value}</div>`;
      }
      html += '</div>';
    }

    return html;
  }

  createDynamicSideColumnText(): string {
    const value1 = this.generateRandomValue(2, 2);
    const value2 = this.generateRandomValue(6, 6);
    const html = `<span class="random-lcars-ref">${value1}<span class="hop">-${value2}</span></span>`;
    return html;
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
