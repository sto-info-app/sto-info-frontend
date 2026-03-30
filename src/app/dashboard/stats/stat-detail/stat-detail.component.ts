import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntil } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { StatInfoCardComponent } from 'src/app/shared/components/stat-info-card/stat-info-card.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StatsBaseComponent } from '../stats-base.component';
import { CountItem, StatsData } from '../stats.models';

/** Configuration for a single breakdown stat page. */
interface StatConfig {
  title: string;
  key: keyof Pick<
    StatsData,
    | 'byLevelRange'
    | 'bySpecies'
    | 'byGeneralFaction'
    | 'byFaction'
    | 'byClass'
    | 'bySex'
    | 'byRecruitType'
    | 'byPlatform'
    | 'byLauncher'
  >;
  showLevelCards: boolean;
}

const STAT_CONFIG: Record<string, StatConfig> = {
  level: { title: 'Level', key: 'byLevelRange', showLevelCards: true },
  species: { title: 'Species', key: 'bySpecies', showLevelCards: false },
  allegiance: {
    title: 'Allegiance',
    key: 'byGeneralFaction',
    showLevelCards: false,
  },
  faction: { title: 'Faction', key: 'byFaction', showLevelCards: false },
  career: { title: 'Career', key: 'byClass', showLevelCards: false },
  sex: { title: 'Sex', key: 'bySex', showLevelCards: false },
  recruitment: {
    title: 'Recruitment',
    key: 'byRecruitType',
    showLevelCards: false,
  },
  platform: { title: 'Platform', key: 'byPlatform', showLevelCards: false },
  launcher: { title: 'Launcher', key: 'byLauncher', showLevelCards: false },
};

/**
 * Generic breakdown detail page for a single stat category.
 * Driven by the `breakdownId` route parameter, which maps to a StatConfig entry.
 */
@Component({
  selector: 'app-stat-detail',
  templateUrl: './stat-detail.component.html',
  styleUrls: ['./stat-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    StatInfoCardComponent,
    SmartChartComponent,
    LcarsInformationMessageComponent,
    FormsModule,
  ],
})
export class StatDetailComponent extends StatsBaseComponent implements OnInit {
  appRoutes = APP_ROUTES;

  /** The derived config for this page, or null if the breakdownId is unknown. */
  config: StatConfig | null = null;

  /** The breakdown items to display. */
  items: CountItem[] = [];

  /** Whether to hide items with 0 count. */
  hideZeros = true;

  private readonly route = inject(ActivatedRoute);

  /** The breakdown items to display (filtered or unfiltered). */
  get displayedItems(): CountItem[] {
    if (!this.hideZeros) {
      return this.items;
    }
    return this.items.filter(item => item.count > 0);
  }

  /** Returns whether there is any non-zero data available. */
  get hasData(): boolean {
    return this.items.some(item => item.count > 0);
  }

  /** Returns whether there are any zero-count items in the results. */
  get hasZeros(): boolean {
    return this.items.some(item => item.count === 0);
  }

  /** Toggles the visibility of items with zero counts. */
  toggleHideZeros(): void {
    this.hideZeros = !this.hideZeros;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('breakdownId') ?? '';
    this.config = STAT_CONFIG[id] ?? null;

    if (!this.config) {
      this.isLoading = false;
      return;
    }

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
          if (this.config) {
            this.items = stats[this.config.key];
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }
}
