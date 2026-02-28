import { AsyncPipe } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component, inject, Input, OnDestroy } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  Subscription,
} from 'rxjs';
import { HealthService } from 'src/app/core/health/health.service';
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
import { FooterComponent } from '../footer/footer.component';
import { MainContentBarPanelComponent } from '../main-content-bar-panel/main-content-bar-panel.component';
import { SideBarComponent } from '../side-bar/side-bar.component';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  standalone: true,
  imports: [
    SideBarComponent,
    MainContentBarPanelComponent,
    RouterOutlet,
    FooterComponent,
    ServiceInterruptionContentComponent,
    AsyncPipe,
  ],
})
export class MainContentComponent implements OnDestroy {
  @Input() isLoggedIn!: boolean;

  appTitle = environment.appTitle;
  frontendAppVersion = environment.version || '';
  backendAppVersion = '';
  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;
  hasActiveRoute = false;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subs = new Subscription();
  private readonly routingService = inject(RoutingService);
  private readonly generalThemeService = inject(GeneralThemeService);
  private readonly http = inject(HttpClient);
  private readonly backendHealth = inject(HealthService);

  // True only when the currently activated deepest route has data.requiresApi === true
  readonly requiresApi$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.getDeepestRouteRequiresApi(this.route)),
    distinctUntilChanged(),
  );

  //NOTE: Show warning only when:
  //NOTE: - current route requires API, AND
  //NOTE: - API is DOWN
  readonly showBackendWarning$ = combineLatest([
    this.requiresApi$,
    this.backendHealth.state$,
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
      this.generalThemeService.createDynamicSideColumnText();

    this.http
      .get(API_URLS.VERSION, {
        observe: 'response',
        responseType: HTTP_RESPONSE_TYPE_TEXT,
      })
      .subscribe({
        next: response => this.updateBackendVersion(response),
        error: err => {
          console.warn(
            'Backend version endpoint failed or returned non-200',
            err,
          );
        },
      });

    // Start/stop polling only while on API-required routes
    this.subs.add(
      this.requiresApi$.subscribe(requiresApi => {
        if (requiresApi) {
          this.backendHealth.startPolling();
        } else {
          this.backendHealth.stopPolling();
        }
      }),
    );
  }

  /**
   * Determines whether the current route is the service interruption route.
   *
   * @returns True if the current route is the service interruption route, false otherwise.
   */
  get isServiceInterruptionRoute(): boolean {
    return this.router.url === this.appRoutes.SERVICE_INTERRUPTION;
  }

  /**
   * Recursively traverses the activated route tree to find the deepest
   */
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Determines whether the deepest activated route has a data property
   * indicating that it requires API availability.
   *
   * @param route The starting activated route.
   * @returns True if the deepest route requires API, false otherwise.
   */
  private getDeepestRouteRequiresApi(route: ActivatedRoute): boolean {
    let activeRoute: ActivatedRoute = route;
    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }
    return activeRoute.snapshot.data?.['requiresApi'] === true;
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
    return this.routingService.getLink(route);
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
