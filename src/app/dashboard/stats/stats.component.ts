import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntil } from 'rxjs';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { StatInfoCardComponent } from 'src/app/shared/components/stat-info-card/stat-info-card.component';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { StatsBaseComponent } from './stats-base.component';

// Re-export for consumers that import these types from this file.
export type { CountItem, StatsData } from './stats.models';

/** Config for a breakdown category tile on the stats hub. */
export interface StatTile {
  label: string;
  breakdownId: string;
  icon: string;
  colour: string;
  /** Precomputed router link for this tile's detail page. */
  link: string;
}

/** All breakdown stat categories shown as tiles on the hub, with links precomputed. */
export const STAT_TILES: StatTile[] = [
  {
    label: 'Level',
    breakdownId: 'level',
    icon: 'fa-ranking-star',
    colour: 'gold',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'level')}`,
  },
  {
    label: 'Species',
    breakdownId: 'species',
    icon: 'fa-dna',
    colour: 'perano',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'species')}`,
  },
  {
    label: 'Allegiance',
    breakdownId: 'allegiance',
    icon: 'fa-shield-halved',
    colour: 'cool',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'allegiance')}`,
  },
  {
    label: 'Faction',
    breakdownId: 'faction',
    icon: 'fa-flag',
    colour: 'sky',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'faction')}`,
  },
  {
    label: 'Career',
    breakdownId: 'career',
    icon: 'fa-briefcase',
    colour: 'sunflower',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'career')}`,
  },
  {
    label: 'Sex',
    breakdownId: 'sex',
    icon: 'fa-venus-mars',
    colour: 'violet',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'sex')}`,
  },
  {
    label: 'Recruitment',
    breakdownId: 'recruitment',
    icon: 'fa-user-plus',
    colour: 'green',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'recruitment')}`,
  },
  {
    label: 'Platform',
    breakdownId: 'platform',
    icon: 'fa-desktop',
    colour: 'tangerine',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'platform')}`,
  },
  {
    label: 'Launcher',
    breakdownId: 'launcher',
    icon: 'fa-rocket-launch',
    colour: 'bluey',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'launcher')}`,
  },
];

/**
 * Stats hub page — shows high-level hero tiles and links to each breakdown sub-page.
 */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    StatInfoCardComponent,
    LcarsInformationMessageComponent,
    FormsModule,
  ],
})
export class StatsComponent extends StatsBaseComponent implements OnInit {
  /** Precomputed router link to the main dashboard. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  /** Precomputed router link to the accounts list. */
  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;

  readonly appRouteTitles = APP_ROUTE_TITLES;
  readonly statTiles = STAT_TILES;

  ngOnInit(): void {
    this.loadAccounts();
    this.loadStats();
  }

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
          this._cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  /**
   * Returns the account detail link when a specific account filter is active,
   * used as the CTA link on the Characters stat card.
   */
  getCharacterCtaLink(): string | undefined {
    let account;
    if (this.selectedAccountId !== 'all') {
      account = this.accounts.find(a => a.id === this.selectedAccountId);
    } else if (this.accounts.length === 1) {
      account = this.accounts[0];
    }
    if (!account) return undefined;
    return this.routingService.getLink(
      APP_ROUTES.STO_ACCOUNT_DETAIL.replace(':handle', account.handle),
    );
  }

  /**
   * Constructs the specific detail page URL for a stat breakdown.
   *
   * @param id The breakdown ID (e.g., 'species', 'level').
   * @returns A router link string for the given breakdown.
   */
  getDetailLink(id: string): string {
    return this.routingService.getLink(
      APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', id),
    );
  }
}
