import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { EMPTY, Subscription, catchError, filter, switchMap } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { NotificationService } from 'src/app/notifications/notification.service';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { TimeFormatPipe } from 'src/app/shared/pipes/time-format.pipe';
import { DebuggingService } from 'src/app/shared/services/debugging.service';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, TimeFormatPipe],
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() showScrollButton = false;
  @Input() isLoggedIn!: boolean;
  @Input() autoLogoutCountdown = 0;
  @Input() logout!: () => void;

  @ViewChild('scrollTopButton')
  scrollTopButton!: ElementRef;

  private readonly _zone = inject(NgZone);
  private readonly _routingService = inject(RoutingService);
  private readonly _generalThemeService = inject(GeneralThemeService);
  private readonly _debuggingService = inject(DebuggingService);
  private readonly _authService = inject(AuthService);
  private readonly _notificationService = inject(NotificationService);

  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  // Check debugging mode
  appDebugging = this._debuggingService.allowDebugging();

  /** Unread notification count driving the header "incoming transmission" alert. */
  readonly unreadCount$ = this._notificationService.unreadCount$;
  private readonly _subs = new Subscription();

  dataCascade: string;
  themePanel2RandomText: string;

  scrollCallbackFunction = (): void => {
    this._zone.run(() => {
      this.toggleScrollTopButton();
    });
  };
  showScrollTop = false;

  constructor() {
    this.dataCascade = this._generalThemeService.createDynamicDataCascade();
    this.themePanel2RandomText =
      this._generalThemeService.createDynamicSideColumnText();
  }

  /**
   * Refreshes the unread notification count from the server whenever the user
   * becomes authenticated (initial load and each login) so the "incoming
   * transmission" alert is accurate.
   *
   * This is intentionally event-driven, not polled: during a session the count
   * stays current because the notifications page writes to the shared
   * {@link NotificationService.unreadCount$} stream on read/unread actions.
   * `switchMap` cancels any in-flight request if the auth state changes again,
   * and the single subscription is torn down in {@link ngOnDestroy}.
   */
  ngOnInit() {
    this._subs.add(
      this._authService.isLoggedIn$
        .pipe(
          filter(loggedIn => loggedIn),
          switchMap(() =>
            this._notificationService.refreshUnreadCount().pipe(
              catchError(() => EMPTY), // Non-critical; the alert stays hidden.
            ),
          ),
        )
        .subscribe(),
    );
  }

  ngAfterViewInit() {
    globalThis.addEventListener?.('scroll', this.scrollCallbackFunction);
  }

  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    this._subs.unsubscribe();
    globalThis.removeEventListener?.('scroll', this.scrollCallbackFunction);
  }

  toggleScrollTopButton() {
    const scrollY = (globalThis as Window | typeof globalThis).scrollY ?? 0;
    this.showScrollButton = scrollY > 100;
  }

  scrollToTop() {
    (globalThis as Window | typeof globalThis).scrollTo?.({
      top: 0,
      behavior: 'smooth',
    });
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Whether the current user is an administrator (controls the Admin link).
   *
   * @returns `true` when logged in as an admin.
   */
  get isAdmin(): boolean {
    return this._authService.isLoggedInAsAdmin();
  }
}
