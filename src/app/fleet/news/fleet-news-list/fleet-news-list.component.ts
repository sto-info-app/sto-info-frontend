import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable, skip } from 'rxjs';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { FLEET_NEWS_PAGE_SIZE } from 'src/app/fleet/news/fleet-news.constants';
import { FleetNewsPageDirective } from 'src/app/fleet/news/fleet-news-page.directive';
import {
  FleetNewsPage,
  FleetNewsQuery,
  FleetNewsStatus,
} from 'src/app/models/fleet-news.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** A page of a scope's news, and how it was asked for. */
export interface FleetNewsListData {
  readonly page: FleetNewsPage;
  /** Whether the page lists drafts rather than published posts. */
  readonly drafts: boolean;
  /** The words searched for, or empty. */
  readonly search: string;
}

/**
 * A Community's, a Fleet's or an Armada's news, newest first (FC-027).
 *
 * Anybody who may see the scope reads the posts published to them, and may
 * search them by title and summary. Its news writers also see its drafts,
 * and are offered a new post while it is open. The page, the search and the
 * choice of drafts live in the address, so each is a link of its own.
 */
@Component({
  selector: 'app-fleet-news-list',
  templateUrl: './fleet-news-list.component.html',
  styleUrls: ['../fleet-news.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class FleetNewsListComponent extends FleetNewsPageDirective<FleetNewsListData> {
  private readonly _router = inject(Router);

  /** Never shown: anybody who may see the scope may open its news. */
  readonly notPermittedMessage = '';

  /** The words in the search box. */
  readonly search = signal('');

  constructor() {
    super();

    // The address carries the page, the search and drafts; a change to any
    // of them reads the news again.
    this._route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  /**
   * Opens to anybody who may see the scope; the server decides what they
   * see.
   *
   * @returns True.
   */
  protected override mayOpen(): boolean {
    return true;
  }

  /**
   * Where a new post is written.
   *
   * @param scope - The scope.
   * @returns The router link.
   */
  writeLinkOf(scope: GovernanceScopeVm): string[] {
    return FLEET_LINKS.newsWrite(this.newsLinkOf(scope));
  }

  /**
   * How many pages there are.
   *
   * @param page - The page shown.
   * @returns At least one.
   */
  totalPages(page: FleetNewsPage): number {
    return Math.max(1, Math.ceil(page.total / page.pageSize));
  }

  /** Searches for the words in the box, from the first page. */
  onSearch(): void {
    const q = this.search().trim();

    this.navigate({ q: q === '' ? null : q, page: null });
  }

  /** Clears the search. */
  onClearSearch(): void {
    this.search.set('');
    this.navigate({ q: null, page: null });
  }

  /**
   * Moves to another page.
   *
   * @param page - The page.
   */
  onPage(page: number): void {
    this.navigate({ page: page === 1 ? null : page });
  }

  /**
   * Switches between published posts and drafts, from the first page.
   *
   * @param drafts - Whether to list drafts.
   */
  onDrafts(drafts: boolean): void {
    this.navigate({ status: drafts ? 'DRAFT' : null, page: null });
  }

  /**
   * Reads the page the address asks for.
   *
   * @param scope - The scope.
   * @returns The page, and how it was asked for.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetNewsListData> {
    const query = queryOf(this._route.snapshot.queryParamMap);

    this.search.set(query.q ?? '');

    return this._news
      .list(scope.target, { ...query, pageSize: FLEET_NEWS_PAGE_SIZE })
      .pipe(
        map(page => ({
          page,
          drafts: query.status === 'DRAFT',
          search: query.q ?? '',
        })),
      );
  }

  /**
   * Changes the address's query, keeping the rest of it.
   *
   * @param queryParams - What to change; null removes it.
   */
  private navigate(queryParams: Record<string, string | number | null>): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}

/**
 * Reads what the address asks for. Anything it cannot use is left out, so a
 * mistyped page is the first page rather than an error.
 *
 * @param params - The address's query.
 * @returns The query to send.
 */
function queryOf(params: ParamMap): FleetNewsQuery {
  const page = Number(params.get('page'));
  const q = params.get('q')?.trim() ?? '';
  const status: FleetNewsStatus | undefined =
    params.get('status') === 'DRAFT' ? 'DRAFT' : undefined;

  return {
    ...(Number.isInteger(page) && page > 1 ? { page } : {}),
    ...(q === '' ? {} : { q }),
    ...(status === undefined ? {} : { status }),
  };
}
