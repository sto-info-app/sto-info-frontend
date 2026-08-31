import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  NgZone,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { RoutingService } from 'src/app/shared/services/routing.service';

/**
 * The dashboard sections that carry a sidebar entry of their own.
 *
 * They are listed so the Dashboard entry can stand down while one of them is
 * being read, leaving exactly one button lit.
 */
const SIDEBAR_DASHBOARD_SECTIONS = [
  APP_ROUTES.STO_DASHBOARD_ACCOUNTS,
  APP_ROUTES.STO_DASHBOARD_STATS,
];

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SideBarComponent {
  @Input() isLoggedIn!: boolean;

  /**
   * Whether to offer Storytime in the navigation.
   *
   * Supplied from above rather than fetched here, matching `isLoggedIn`. The
   * sidebar renders on every page and in most component tests, so giving it
   * its own HTTP dependency would make it expensive to render and awkward to
   * test everywhere it appears.
   *
   * Defaults to hidden so the link never flickers into view before the feature
   * state is known — a link that appears and then disappears is worse than one
   * that arrives a moment late.
   */
  @Input() isStorytimeEnabled = false;

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;
  themePanel6RandomText: string;

  /**
   * Whether the Dashboard entry is lit.
   *
   * Held as a field written from the router's own events rather than read
   * from a getter during change detection. A component that declares no
   * strategy gets `OnPush` in Angular 22, so a binding here is only
   * re-evaluated while this view is dirty — and a navigation elsewhere on the
   * page does not dirty the sidebar. `routerLinkActive`, which lights every
   * other entry, sidesteps that by setting the class through the renderer;
   * this field has to be pushed the same way or the entry keeps whatever
   * state it was last rendered with.
   */
  isDashboardActive = false;

  isPanel5Hidden = false;
  isPanel7Hidden = false;
  isPanel8Hidden = false;
  isPanel10Hidden = false;

  private readonly _router = inject(Router);
  private readonly _routingService = inject(RoutingService);
  private readonly _generalThemeService = inject(GeneralThemeService);
  private readonly _authService = inject(AuthService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    this.themePanel6RandomText =
      this._generalThemeService.createDynamicSideColumnText();

    this.isDashboardActive = this.matchesDashboard();
    this.watchDashboardEntry();
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Whether the current user is an administrator.
   *
   * @returns `true` when logged in as an admin user.
   */
  get isAdmin(): boolean {
    return this._authService.isLoggedInAsAdmin();
  }

  onResize(event: Event): void {
    const target = event.target as HTMLElement | null;
    const height = target?.getBoundingClientRect().height ?? 0;
    this.isPanel5Hidden = height >= 900;
    this.isPanel7Hidden = height >= 1200;
    this.isPanel10Hidden = height >= 1500;
    this.isPanel8Hidden = height >= 1800;
  }

  /**
   * Keeps the Dashboard entry in step with the address.
   *
   * `observeInZone` is what pushes the new state onto the screen: it re-enters
   * the zone and runs a pass on this view, so the entry changes even when the
   * navigation that finished did not dirty the sidebar.
   */
  private watchDashboardEntry(): void {
    this._router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(() => {
        this.isDashboardActive = this.matchesDashboard();
      });
  }

  /**
   * Whether the address is the dashboard or one of its own pages.
   *
   * Every other entry lets `routerLinkActive` match on the start of the
   * address, so a page below the section keeps its section's button on. The
   * dashboard cannot: Your Accounts and Stats live underneath it and have
   * sidebar entries of their own, so a prefix match would light this button
   * alongside theirs. It is lit for the dashboard itself and for the pages
   * under it that have no entry of their own, such as Profile and Settings.
   *
   * @returns `true` when the Dashboard entry should be lit.
   */
  private matchesDashboard(): boolean {
    const path = this._router.url.split(/[?#]/)[0];

    if (!this.isPathUnder(path, APP_ROUTES.STO_DASHBOARD)) return false;

    return !SIDEBAR_DASHBOARD_SECTIONS.some(section =>
      this.isPathUnder(path, section),
    );
  }

  /**
   * Whether an address sits at or below a route.
   *
   * Compares whole segments so a route is never matched by an address that
   * merely begins with the same letters.
   *
   * @param path The current address, without query string or fragment.
   * @param route The route to test against.
   * @returns `true` when the address is the route or a page beneath it.
   */
  private isPathUnder(path: string, route: string): boolean {
    const link = this._routingService.getLink(route);
    return path === link || path.startsWith(link + '/');
  }
}
