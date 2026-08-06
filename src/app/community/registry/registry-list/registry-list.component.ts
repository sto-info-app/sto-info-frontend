import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  RegistryListMode,
  RegistryProfileSummary,
  RegistrySort,
} from '../../models/registry.models';
import { RegistryProfileCardComponent } from '../registry-profile-card/registry-profile-card.component';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

const PAGE_SIZE = 12;

/**
 * Copy and sort order for each list mode.
 */
const MODE_CONFIG: Record<
  RegistryListMode,
  { heading: string; intro: string; sort: RegistrySort; empty: string }
> = {
  all: {
    heading: 'Profiles',
    intro: 'Every officer who has opened their record to the fleet.',
    sort: RegistrySort.USERNAME,
    empty: 'No officers have opened their records yet.',
  },
  search: {
    heading: 'Search the Registry',
    intro: 'Search for an officer by their STO Info username.',
    sort: RegistrySort.USERNAME,
    empty: 'No officers match that search.',
  },
  'recently-joined': {
    heading: 'Recently Joined',
    intro: 'The newest officers to open their records to the fleet.',
    sort: RegistrySort.RECENTLY_JOINED,
    empty: 'No officers have opened their records yet.',
  },
  'recently-active': {
    heading: 'Recently Active',
    intro: 'Officers seen most recently on station.',
    sort: RegistrySort.RECENTLY_ACTIVE,
    empty: 'No officers have opened their records yet.',
  },
};

/**
 * The registry's list pages — Search, Recently Joined, Recently Active and the
 * full profile browse. All four share this component and differ only by the
 * `mode` supplied in route data.
 */
@Component({
  selector: 'app-registry-list',
  templateUrl: './registry-list.component.html',
  styleUrls: ['./registry-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    RegistryProfileCardComponent,
  ],
})
export class RegistryListComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _routingService = inject(RoutingService);

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  mode: RegistryListMode = 'all';
  searchTerm = '';

  profiles: RegistryProfileSummary[] = [];
  page = 1;
  total = 0;

  /**
   * Reads the list mode from route data, seeds the search box from the URL and
   * loads the first page.
   */
  ngOnInit(): void {
    this.mode =
      (this._route.snapshot.data['mode'] as RegistryListMode) ?? 'all';

    if (this.mode === 'search') {
      this.searchTerm = this._route.snapshot.queryParamMap.get('q') ?? '';
    }

    this.loadPage(1);
  }

  /**
   * Loads a specific page of registry members.
   *
   * @param page - The 1-based page number.
   */
  loadPage(page: number): void {
    this.page = page;

    this.runLoad(
      this._registryService.getProfiles({
        page,
        pageSize: PAGE_SIZE,
        sort: MODE_CONFIG[this.mode].sort,
        search: this.activeSearch,
      }),
      result => {
        this.profiles = result?.items ?? [];
        this.total = result?.total ?? 0;
      },
      'Something went wrong loading the registry.',
    );
  }

  /**
   * Runs a search, resetting to the first page and reflecting the term in the
   * URL so the result is shareable.
   */
  search(): void {
    const term = this.searchTerm.trim();

    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: term ? { q: term } : {},
      replaceUrl: true,
    });

    this.loadPage(1);
  }

  /**
   * Clears the search term and reloads the unfiltered first page.
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.search();
  }

  /**
   * The search term to send to the API, if this mode searches at all.
   *
   * @returns The trimmed term, or undefined when not searching.
   */
  private get activeSearch(): string | undefined {
    if (this.mode !== 'search') {
      return undefined;
    }

    return this.searchTerm.trim() || undefined;
  }

  /**
   * The page heading for the active mode.
   *
   * @returns The heading text.
   */
  get heading(): string {
    return MODE_CONFIG[this.mode].heading;
  }

  /**
   * The introductory copy for the active mode.
   *
   * @returns The intro text.
   */
  get intro(): string {
    return MODE_CONFIG[this.mode].intro;
  }

  /**
   * The empty-state copy for the active mode.
   *
   * @returns The empty-state text.
   */
  get emptyMessage(): string {
    return MODE_CONFIG[this.mode].empty;
  }

  /**
   * Total number of pages for the current query.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
