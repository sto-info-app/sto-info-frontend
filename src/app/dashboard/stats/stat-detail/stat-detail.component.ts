import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, switchMap, takeUntil } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { StatInfoCardComponent } from 'src/app/shared/components/stat-info-card/stat-info-card.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { StatsBaseComponent } from '../stats-base.component';
import { CountItem, StatsData } from '../stats.models';

/** Configuration for a single breakdown stat page. */
interface StatConfig {
  title: string;
  label: string;
  section: 'account' | 'character' | 'endeavour';
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
    | 'byEndeavourPerk'
    | 'byEndeavourPerkAvg'
    | 'byEndeavourCategory'
    | 'byEndeavourCategoryPct'
  >;
  showLevelCards: boolean;
}

const STAT_CONFIG: Record<string, StatConfig> = {
  level: {
    title: 'Level',
    label: 'Level',
    section: 'character',
    key: 'byLevelRange',
    showLevelCards: true,
  },
  species: {
    title: 'Species',
    label: 'Species',
    section: 'character',
    key: 'bySpecies',
    showLevelCards: false,
  },
  allegiance: {
    title: 'Allegiance',
    label: 'Allegiance',
    section: 'character',
    key: 'byGeneralFaction',
    showLevelCards: false,
  },
  faction: {
    title: 'Faction',
    label: 'Faction',
    section: 'character',
    key: 'byFaction',
    showLevelCards: false,
  },
  career: {
    title: 'Career',
    label: 'Career',
    section: 'character',
    key: 'byClass',
    showLevelCards: false,
  },
  sex: {
    title: 'Sex',
    label: 'Sex',
    section: 'character',
    key: 'bySex',
    showLevelCards: false,
  },
  recruitment: {
    title: 'Recruitment',
    label: 'Recruitment',
    section: 'character',
    key: 'byRecruitType',
    showLevelCards: false,
  },
  platform: {
    title: 'Platform',
    label: 'Platform',
    section: 'account',
    key: 'byPlatform',
    showLevelCards: false,
  },
  launcher: {
    title: 'Launcher',
    label: 'Launcher',
    section: 'account',
    key: 'byLauncher',
    showLevelCards: false,
  },
  endeavourPerk: {
    title: 'Endeavour Perks – Total',
    label: 'Perks (Total)',
    section: 'endeavour',
    key: 'byEndeavourPerk',
    showLevelCards: false,
  },
  endeavourPerkAvg: {
    title: 'Endeavour Perks – Average per Account',
    label: 'Perks (Average)',
    section: 'endeavour',
    key: 'byEndeavourPerkAvg',
    showLevelCards: false,
  },
  endeavourCategory: {
    title: 'Endeavour Category – Total',
    label: 'Category (Total)',
    section: 'endeavour',
    key: 'byEndeavourCategory',
    showLevelCards: false,
  },
  endeavourCategoryPct: {
    title: 'Endeavour Category – % Complete',
    label: 'Category (% Complete)',
    section: 'endeavour',
    key: 'byEndeavourCategoryPct',
    showLevelCards: false,
  },
};

/** All stat configs in section order, used to build the navigation dropdown. */
const SECTION_ENTRIES: Record<string, { id: string; label: string }[]> =
  (() => {
    const groups: Record<string, { id: string; label: string }[]> = {};
    for (const [id, cfg] of Object.entries(STAT_CONFIG)) {
      if (!groups[cfg.section]) groups[cfg.section] = [];
      groups[cfg.section].push({ id, label: cfg.label });
    }
    for (const entries of Object.values(groups)) {
      entries.sort((a, b) => a.label.localeCompare(b.label));
    }
    return groups;
  })();

const SECTION_TITLES: Record<string, string> = {
  account: 'Account Breakdowns',
  character: 'Character Breakdowns',
  endeavour: 'Endeavours',
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

  /** The active route param value. */
  breakdownId = '';

  /** The breakdown items to display. */
  items: CountItem[] = [];

  /** Whether to hide items with 0 count. */
  hideZeros = true;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  // No `_cdr` here: StatsBaseComponent already provides one, and redeclaring
  // it would shadow the instance the base class marks for check.

  /** Reports in the same section, sorted alphabetically, for the navigation dropdown. */
  get sectionEntries(): { id: string; label: string }[] {
    return this.config ? (SECTION_ENTRIES[this.config.section] ?? []) : [];
  }

  /** Human-readable section heading for the navigation dropdown. */
  get sectionTitle(): string {
    return this.config ? (SECTION_TITLES[this.config.section] ?? '') : '';
  }

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

  /** Navigates to a different report within the same section. */
  navigateToReport(id: string): void {
    void this._router.navigateByUrl(
      `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', id)}`,
    );
  }

  ngOnInit(): void {
    this.loadAccounts();

    this._route.paramMap
      .pipe(
        takeUntil(this._destroy$),
        switchMap(params => {
          const id = params.get('breakdownId') ?? '';
          this.breakdownId = id;
          this.config = STAT_CONFIG[id] ?? null;
          this.items = [];
          this.hideZeros = true;

          if (!this.config) {
            this.isLoading = false;
            this._cdr.markForCheck();
            return EMPTY;
          }

          this.isLoading = true;
          const accountId =
            this.selectedAccountId === 'all' ? null : this.selectedAccountId;
          return this._statsService.getStats(accountId);
        }),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: stats => {
          this.stats = stats;
          if (this.config) {
            this.items = stats[this.config.key];
          }
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  loadStats(): void {
    this.fetchStats(stats => {
      this.stats = stats;
      if (this.config) {
        this.items = stats[this.config.key];
      }
    });
  }
}
