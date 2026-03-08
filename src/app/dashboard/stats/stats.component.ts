import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StatsService } from '../services/stats.service';

/** Represents a name-count pair used for breakdown stats. */
export interface CountItem {
  name: string;
  count: number;
}

/** The full set of stats returned by GET /stats. */
export interface StatsData {
  accountCount: number;
  lifetimeSubCount: number;
  characterCount: number;
  avgLevel: number;
  minLevel: number;
  maxLevel: number;
  bySpecies: CountItem[];
  byGeneralFaction: CountItem[];
  byFaction: CountItem[];
  byClass: CountItem[];
  bySex: CountItem[];
  byRecruitType: CountItem[];
  byLevelRange: CountItem[];
  byPlatform: CountItem[];
  byLauncher: CountItem[];
}

/** Config for a breakdown category tile on the stats hub. */
export interface StatTile {
  label: string;
  breakdownId: string;
  icon: string;
  colour: string;
}

/** All breakdown stat categories shown as tiles on the hub. */
export const STAT_TILES: StatTile[] = [
  {
    label: 'Level',
    breakdownId: 'level',
    icon: 'fa-ranking-star',
    colour: 'gold',
  },
  {
    label: 'Species',
    breakdownId: 'species',
    icon: 'fa-dna',
    colour: 'perano',
  },
  {
    label: 'Allegiance',
    breakdownId: 'allegiance',
    icon: 'fa-shield-halved',
    colour: 'cool',
  },
  { label: 'Faction', breakdownId: 'faction', icon: 'fa-flag', colour: 'sky' },
  {
    label: 'Career',
    breakdownId: 'career',
    icon: 'fa-briefcase',
    colour: 'sunflower',
  },
  { label: 'Sex', breakdownId: 'sex', icon: 'fa-venus-mars', colour: 'violet' },
  {
    label: 'Recruitment',
    breakdownId: 'recruitment',
    icon: 'fa-user-plus',
    colour: 'green',
  },
  {
    label: 'Platform',
    breakdownId: 'platform',
    icon: 'fa-desktop',
    colour: 'tangerine',
  },
  {
    label: 'Launcher',
    breakdownId: 'launcher',
    icon: 'fa-rocket-launch',
    colour: 'bluey',
  },
];

import { FormsModule } from '@angular/forms';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { StatInfoCardComponent } from 'src/app/shared/components/stat-info-card/stat-info-card.component';
import { StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';

/**
 * Stats hub page — shows high-level hero tiles and links to each breakdown sub-page.
 */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    StatInfoCardComponent,
    LcarsInformationMessageComponent,
    FormsModule,
  ],
})
export class StatsComponent implements OnInit, OnDestroy {
  appRoutes = APP_ROUTES;
  statTiles = STAT_TILES;

  stats: StatsData | null = null;
  accounts: StoAccount[] = [];
  selectedAccountId: string = 'all';
  isLoading = true;

  private readonly statsService = inject(StatsService);
  private readonly stoAccountService = inject(StoAccountService);
  private readonly routingService = inject(RoutingService);
  private readonly destroy$ = new Subject<void>();

  /**
   * Initialises the component by fetching all statistics and accounts.
   *
   */
  ngOnInit(): void {
    this.loadAccounts();
    this.loadStats();
  }

  /**
   * Fetches the statistics, optionally filtered by account.
   */
  loadStats(): void {
    this.isLoading = true;
    const accountId =
      this.selectedAccountId === 'all' ? null : this.selectedAccountId;
    this.statsService
      .getStats(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  /**
   * Fetches the user's accounts.
   */
  private loadAccounts(): void {
    this.stoAccountService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: accounts => {
          this.accounts = accounts;
        },
      });
  }

  /**
   * Handles account selection changes.
   * @param accountId The selected account ID or null for all accounts.
   */
  onAccountChange(accountId: string): void {
    this.selectedAccountId = accountId;
    this.loadStats();
  }

  /**
   * Cleans up subscriptions.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns the full URL for a route constant.
   *
   * @param route The route constant name.
   */
  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  /**
   * Returns the account detail link when a specific account filter is active,
   * used as the CTA link on the Characters stat card.
   */
  getCharacterCtaLink(): string | undefined {
    if (this.selectedAccountId === 'all') return undefined;
    const account = this.accounts.find(a => a.id === this.selectedAccountId);
    if (!account) return undefined;
    return this.routingService.getLink(
      APP_ROUTES.STO_ACCOUNT_DETAIL.replace(':handle', account.handle),
    );
  }

  /**
   * Constructs the specific detail page URL for a stat breakdown.
   *
   * @param id The breakdown ID (e.g., 'species', 'level').
   */
  getDetailLink(id: string): string {
    return this.routingService.getLink(
      APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', id),
    );
  }
}
