import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminSideNavigationComponent } from 'src/app/admin/admin-side-navigation/admin-side-navigation.component';
import {
  CountWindows,
  ROLE_LABELS,
  SiteStatistics,
  WeeklyCount,
} from 'src/app/models/site-statistics.models';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  ChartDataItem,
  SmartChartComponent,
} from 'src/app/shared/components/smart-chart/smart-chart.component';
import { StatInfoCardComponent } from 'src/app/shared/components/stat-info-card/stat-info-card.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { SiteStatisticsAdminService } from './site-statistics-admin.service';

/** One panel on the page: a count over the four windows, or a single total. */
export interface StatCard {
  key: string;
  label: string;
  /** A line under the number saying what is and is not counted. */
  note?: string;
  windows?: CountWindows;
  total?: number;
}

/** One section of panels. */
export interface StatSection {
  key: string;
  heading: string;
  cards: StatCard[];
}

/** The four windows, in the order the panels show them. */
export const WINDOW_LABELS: readonly [keyof CountWindows, string][] = [
  ['today', 'Today'],
  ['last7Days', '7 days'],
  ['last30Days', '30 days'],
  ['allTime', 'All time'],
];

/** The headline tiles' colours, in turn. */
const HERO_COLOURS = ['sunflower', 'perano', 'tangerine', 'violet'] as const;

/**
 * Names a week by the Monday it starts on, as "w/c 19 Oct".
 *
 * @param weekStarting - The Monday, as a date.
 * @returns The name.
 */
export function weekLabel(weekStarting: string): string {
  const [, month, day] = weekStarting.split('-').map(Number);
  const monday = new Date(Date.UTC(2000, month - 1, day));

  return `w/c ${day} ${monday.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
}

/**
 * The site's high-level numbers, for site administrators (FC-053).
 *
 * Four headline tiles, two charts of the last twelve weeks, and a section of
 * panels for each group: users, Storytime, Fleet Communities, and STO records
 * with news and the queues. A panel with four windows counts since 00:00 UTC
 * today, over the last seven and thirty days, and ever; a panel with one
 * number is a total as of now. Every figure is a count, and none names
 * anybody.
 */
@Component({
  selector: 'app-site-statistics',
  templateUrl: './site-statistics.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './site-statistics.component.scss',
  ],
  standalone: true,
  imports: [
    AdminSideNavigationComponent,
    AppDatePipe,
    CollapsibleSectionComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
    SmartChartComponent,
    StatInfoCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteStatisticsComponent implements OnInit {
  private readonly _statistics = inject(SiteStatisticsAdminService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly windowLabels = WINDOW_LABELS;
  readonly heroColours = HERO_COLOURS;

  readonly statistics = signal<SiteStatistics | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** The four headline tiles. */
  readonly heroTiles = computed(() => {
    const statistics = this.statistics();
    if (!statistics) {
      return [];
    }

    return [
      { label: 'Members', value: statistics.users.total, icon: 'fas fa-users' },
      {
        label: 'Active in 30 days',
        value: statistics.users.active.last30Days,
        icon: 'fas fa-user-check',
      },
      {
        label: 'Joined in 30 days',
        value: statistics.users.registrations.last30Days,
        icon: 'fas fa-user-plus',
      },
      {
        label: 'Open reports',
        value: statistics.content.openReports.total,
        icon: 'fas fa-flag',
      },
    ];
  });

  /** Sign-ups by week, oldest first. */
  readonly registrationsByWeek = computed<ChartDataItem[]>(() =>
    toChart(this.statistics()?.registrationsByWeek ?? []),
  );

  /** Members by the week they were last seen in, oldest first. */
  readonly lastSeenByWeek = computed<ChartDataItem[]>(() =>
    toChart(this.statistics()?.lastSeenByWeek ?? []),
  );

  /** The sections of panels, in page order. */
  readonly sections = computed<StatSection[]>(() => {
    const statistics = this.statistics();

    return statistics ? sectionsOf(statistics) : [];
  });

  /**
   * Reads the numbers.
   */
  ngOnInit(): void {
    this._statistics
      .read()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: statistics => {
          this.statistics.set(statistics);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('The statistics could not be read.');
          this.isLoading.set(false);
        },
      });
  }
}

/**
 * A weekly series as the chart draws it.
 *
 * @param series - The weeks, oldest first.
 * @returns One bar a week.
 */
function toChart(series: WeeklyCount[]): ChartDataItem[] {
  return series.map(week => ({
    name: weekLabel(week.weekStarting),
    count: week.count,
  }));
}

/**
 * Lays the statistics out as sections of panels.
 *
 * @param statistics - The numbers.
 * @returns The sections, in page order.
 */
function sectionsOf(statistics: SiteStatistics): StatSection[] {
  const { users, storytime, fleet, content } = statistics;

  return [
    {
      key: 'users',
      heading: 'Members',
      cards: [
        {
          key: 'registrations',
          label: 'Sign-ups',
          note: 'Accounts registered, since-closed ones included.',
          windows: users.registrations,
        },
        {
          key: 'active',
          label: 'Active members',
          note: 'Open accounts last seen in the window; all time is everyone ever seen.',
          windows: users.active,
        },
        {
          key: 'total',
          label: 'Open accounts',
          total: users.total,
        },
        {
          key: 'verified',
          label: 'Email verified',
          note: 'Of the open accounts.',
          total: users.verified,
        },
        {
          key: 'disabled',
          label: 'Disabled',
          note: 'Open accounts a site admin has disabled.',
          total: users.disabled,
        },
        {
          key: 'closed',
          label: 'Closed',
          note: 'Awaiting their final deletion.',
          total: users.closed,
        },
        ...users.byRole.map(entry => ({
          key: `role-${entry.role.toLowerCase()}`,
          label: ROLE_LABELS[entry.role] ?? entry.role,
          note: 'By role, among the open accounts.',
          total: entry.count,
        })),
      ],
    },
    {
      key: 'storytime',
      heading: 'Storytime',
      cards: [
        {
          key: 'stories',
          label: 'Stories published',
          note: 'By first publication; all time is how many are live.',
          windows: storytime.storiesPublished,
        },
        {
          key: 'chapters',
          label: 'Chapters published',
          note: 'By first publication; all time is how many are live.',
          windows: storytime.chaptersPublished,
        },
        {
          key: 'arcs',
          label: 'Arcs published',
          note: 'By first publication; all time is how many are live.',
          windows: storytime.arcsPublished,
        },
        {
          key: 'comments',
          label: 'Comments',
          note: 'Made, whether or not they still show.',
          windows: storytime.comments,
        },
        {
          key: 'spotlights',
          label: 'Spotlights live',
          total: storytime.spotlightsLive,
        },
      ],
    },
    {
      key: 'fleet',
      heading: 'Fleet Communities',
      cards: [
        {
          key: 'communities',
          label: 'Communities registered',
          windows: fleet.communities.registered,
        },
        {
          key: 'fleets',
          label: 'Fleets registered',
          windows: fleet.fleets.registered,
        },
        {
          key: 'armadas',
          label: 'Armadas registered',
          windows: fleet.armadas.registered,
        },
        {
          key: 'chat',
          label: 'Chat messages',
          note: 'Sent, removed ones included.',
          windows: fleet.chatMessages,
        },
        {
          key: 'applications',
          label: 'Applications',
          note: 'To join a Fleet, by when they were submitted.',
          windows: fleet.applications,
        },
        {
          key: 'events',
          label: 'Events',
          note: 'Created, cancelled ones included.',
          windows: fleet.events,
        },
        {
          key: 'communities-active',
          label: 'Communities active',
          note: 'Not suspended or closed.',
          total: fleet.communities.active,
        },
        {
          key: 'fleets-active',
          label: 'Fleets active',
          note: 'Not suspended or closed.',
          total: fleet.fleets.active,
        },
        {
          key: 'armadas-active',
          label: 'Armadas active',
          note: 'Not suspended or closed.',
          total: fleet.armadas.active,
        },
        {
          key: 'members',
          label: 'Fleet members',
          note: 'Members with approved access to at least one Community, Fleet or Armada, each counted once.',
          total: fleet.members,
        },
      ],
    },
    {
      key: 'content',
      heading: 'STO records, news and queues',
      cards: [
        {
          key: 'accounts',
          label: 'STO accounts',
          note: 'Recorded, by when; deleted ones are not counted.',
          windows: content.stoAccounts,
        },
        {
          key: 'characters',
          label: 'Characters',
          note: 'Recorded, by when; deleted ones are not counted.',
          windows: content.stoCharacters,
        },
        {
          key: 'news',
          label: 'News posts published',
          note: "The site's own; Fleet news is not counted.",
          windows: content.newsPublished,
        },
        {
          key: 'reports-members',
          label: 'Open member reports',
          total: content.openReports.members,
        },
        {
          key: 'reports-chat',
          label: 'Open chat reports',
          total: content.openReports.chat,
        },
      ],
    },
  ];
}
