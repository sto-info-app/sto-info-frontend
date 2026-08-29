import { AsyncPipe } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, Subscription } from 'rxjs';
import { HealthService } from 'src/app/core/health/health.service';
import {
  createRequiresApiStream,
  routeRequiresApi,
} from 'src/app/core/health/requires-api';
import { ServiceInterruptionContentComponent } from 'src/app/error-pages/service-interruption/service-interruption-content/service-interruption-content.component';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { API_HEALTH_STATE_DOWN } from 'src/app/shared/constants/health.constants';
import {
  HTTP_RESPONSE_TYPE_TEXT,
  HTTP_STATUS_OK,
} from 'src/app/shared/constants/http.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { BannerComponent } from 'src/app/notifications/banner/banner.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { FooterComponent } from '../footer/footer.component';
import { MainContentBarPanelComponent } from '../main-content-bar-panel/main-content-bar-panel.component';
import { SideBarComponent } from '../side-bar/side-bar.component';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.scss',
  standalone: true,
  imports: [
    SideBarComponent,
    MainContentBarPanelComponent,
    RouterOutlet,
    FooterComponent,
    ServiceInterruptionContentComponent,
    BannerComponent,
    AsyncPipe,
  ],
})
export class MainContentComponent implements OnDestroy {
  @Input() isLoggedIn!: boolean;

  /**
   * Whether Storytime should be offered in the navigation.
   *
   * Passed straight through to the sidebar. Resolved once at the application
   * root rather than here, so the feature state is fetched a single time
   * however often this component is rendered in tests.
   */
  @Input() isStorytimeEnabled = false;

  appTitle = environment.appTitle;
  frontendAppVersion = environment.version || '';
  backendAppVersion = '';
  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;
  hasActiveRoute = false;
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _subs = new Subscription();
  private readonly _routingService = inject(RoutingService);
  private readonly _generalThemeService = inject(GeneralThemeService);
  private readonly _http = inject(HttpClient);
  private readonly _backendHealth = inject(HealthService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  // True only when the currently activated deepest route has data.requiresApi === true
  readonly requiresApi$ = createRequiresApiStream(this._router, this._route);

  //NOTE: Show warning only when:
  //NOTE: - current route requires API, AND
  //NOTE: - API is DOWN
  readonly showBackendWarning$ = combineLatest([
    this.requiresApi$,
    this._backendHealth.state$,
  ]).pipe(
    map(
      ([requiresApi, state]) => requiresApi && state === API_HEALTH_STATE_DOWN,
    ),
    distinctUntilChanged(),
  );

  /**
   * Initializes the main content component and kicks off
   * generation of side panel text and retrieval of the
   * backend application version from the API.
   */
  constructor() {
    this.themePanel6RandomText =
      this._generalThemeService.createDynamicSideColumnText();

    if (environment.env_name !== 'lighthouse-audit') {
      this._http
        .get(API_URLS.VERSION, {
          observe: 'response',
          responseType: HTTP_RESPONSE_TYPE_TEXT,
        })
        .pipe(observeInZone(this._ngZone, this._cdr))
        .subscribe({
          next: response => this.updateBackendVersion(response),
          error: err => {
            console.warn(
              'Backend version endpoint failed or returned non-200',
              err,
            );
          },
        });
    }

    // Start/stop polling only while on API-required routes
    this._subs.add(
      // No `observeInZone` here: this drives the health poller and touches
      // nothing the template reads.
      this.requiresApi$.subscribe(requiresApi => {
        if (requiresApi) {
          this._backendHealth.startPolling();
        } else {
          this._backendHealth.stopPolling();
        }
      }),
    );
  }

  /**
   * Determines whether the current route is the service interruption route.
   *
   * Compares against the router's own form of the address — leading slash,
   * without any query string or fragment — so a visitor sent here by a guard
   * still gets the interruption panel before the route's component activates.
   *
   * @returns True if the current route is the service interruption route, false otherwise.
   */
  get isServiceInterruptionRoute(): boolean {
    const path = this._router.url.split(/[?#]/)[0];
    return path === `/${this.appRoutes.SERVICE_INTERRUPTION}`;
  }

  /**
   * Recursively traverses the activated route tree to find the deepest
   */
  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  /**
   * Determines whether the deepest activated route has a data property
   * indicating that it requires API availability.
   *
   * @param route The starting activated route.
   * @returns True if the deepest route requires API, false otherwise.
   */
  private getDeepestRouteRequiresApi(route: ActivatedRoute): boolean {
    return routeRequiresApi(route);
  }

  /**
   * Updates the tracked backend application version based on the
   * HTTP response from the version endpoint.
   *
   * @param response The HTTP response containing the backend version payload.
   */
  private updateBackendVersion(response: HttpResponse<string>): void {
    if (
      response.status === HTTP_STATUS_OK &&
      typeof response.body === 'string'
    ) {
      this.backendAppVersion = response.body;
    }
  }

  /**
   * Builds a router link for the provided route identifier.
   *
   * @param route The route key or path segment to navigate to.
   * @returns A normalized link string suitable for routerLink.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Handles actions to perform when a route is activated.
   */
  onRouteActivate() {
    this.hasActiveRoute = true;
  }

  /**
   * Handles actions to perform when a route is deactivated.
   */
  onRouteDeactivate() {
    this.hasActiveRoute = false;
  }
}
