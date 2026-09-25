import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, Router, RouterLink } from '@angular/router';

import { map, Observable, of, switchMap } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { ActivityReportComponent } from 'src/app/fleet/fleet-reports/activity-report/activity-report.component';
import { ContributionReportComponent } from 'src/app/fleet/fleet-reports/contribution-report/contribution-report.component';
import {
  FleetReportService,
  FleetReportsByKind,
} from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  FLEET_REPORT_LABELS,
  FLEET_REPORTS,
} from 'src/app/fleet/fleet-reports/fleet-report.text';
import { GrowthReportComponent } from 'src/app/fleet/fleet-reports/growth-report/growth-report.component';
import { RanksReportComponent } from 'src/app/fleet/fleet-reports/ranks-report/ranks-report.component';
import { TenureReportComponent } from 'src/app/fleet/fleet-reports/tenure-report/tenure-report.component';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetReport,
  FleetReportAccess,
  FleetReportQuery,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { saveFile } from 'src/app/shared/utils/save-file.utils';
import {
  endOfLocalDay,
  localDayOf,
  startOfLocalDay,
} from 'src/app/shared/utils/zoned-day.utils';

/**
 * What to say to somebody the page cannot answer. Every reader may open it,
 * so this is never shown: the server decides which reports they see.
 */
export const FLEET_REPORTS_NOT_PERMITTED =
  'None of these reports is yours to see.';

/** What to say when none of the Fleet's reports is shown to the reader. */
export const FLEET_REPORTS_NONE =
  'None of this Fleet’s reports is shown to you. Its Owner chooses who ' +
  'sees each.';

/** What to say when the CSV could not be made. */
export const FLEET_REPORTS_CSV_FAILED =
  'The CSV could not be made. Please try again.';

/** The Fleet's reports, and the one being read. */
export interface FleetReportsData {
  /** The reports the reader may see, and how much of each. */
  readonly access: readonly FleetReportAccess[];
  /** The report being read; null when the reader may see none. */
  readonly chosen: FleetReport | null;
  /** The report itself; null exactly when `chosen` is. */
  readonly shown: FleetReportsByKind[FleetReport] | null;
  /** The span asked for, and the export its detail is drawn at. */
  readonly query: FleetReportQuery;
  /** The reader's display timezone, which days are picked in. */
  readonly timezone: string;
  readonly section: FleetSection;
}

/** How the CSV download stands. */
export type FleetReportsCsvState = 'IDLE' | 'BUSY' | 'FAILED';

/**
 * A Fleet's reports (FC-020).
 *
 * Open to anybody who can see the Fleet: which reports a reader is shown,
 * and whether in full or as counts only, is each report's audience, which
 * the server applies. A report hidden from the reader answers as absent.
 *
 * Everything the reader chooses — the report, the span and the export the
 * detail is drawn at — is in the address, so a view can be bookmarked and
 * shared. Days are picked in the reader's own timezone. The CSV holds the
 * tables exactly as shown, and is named by the Fleet, the report and the
 * day, since the browser cannot read the name the server gave it.
 */
@Component({
  selector: 'app-fleet-reports-page',
  templateUrl: './fleet-reports-page.component.html',
  styleUrls: ['./fleet-reports-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    GrowthReportComponent,
    ActivityReportComponent,
    TenureReportComponent,
    RanksReportComponent,
    ContributionReportComponent,
  ],
})
export class FleetReportsPageComponent extends FleetSectionPageDirective<FleetReportsData> {
  private readonly _router = inject(Router);
  private readonly _reportService = inject(FleetReportService);
  private readonly _settingsService = inject(UserSettingsService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_REPORTS_NOT_PERMITTED;
  readonly noneMessage = FLEET_REPORTS_NONE;
  readonly csvFailedMessage = FLEET_REPORTS_CSV_FAILED;
  readonly reports = FleetReport;
  readonly reportLabels = FLEET_REPORT_LABELS;
  readonly aggregate = FleetReportView.AGGREGATE;

  /** How the CSV download stands. */
  readonly csvState = signal<FleetReportsCsvState>('IDLE');

  /** Anybody who can see the Fleet may open the page. */
  protected readonly _requiredCapabilities: readonly string[] = [];

  /**
   * The reports the reader may see, in the order they are offered.
   *
   * @param data - The page.
   * @returns The reports.
   */
  offered(data: FleetReportsData): FleetReport[] {
    return FLEET_REPORTS.filter(report =>
      data.access.some(entry => entry.report === report),
    );
  }

  /**
   * The report being read, as the kind it is.
   *
   * @param data - The page.
   * @param kind - The kind wanted.
   * @returns The report, when it is that kind; otherwise null.
   */
  reportAs<K extends FleetReport>(
    data: FleetReportsData,
    kind: K,
  ): FleetReportsByKind[K] | null {
    return data.chosen === kind ? (data.shown as FleetReportsByKind[K]) : null;
  }

  /**
   * The address's query for another report, keeping the span.
   *
   * @param report - The report.
   * @returns The query to merge; its detail export goes, being another's.
   */
  queryFor(report: FleetReport): Record<string, string | null> {
    return { report: report.toLowerCase(), at: null };
  }

  /**
   * The day an instant fell on, in the reader's timezone.
   *
   * @param data - The page, with the reader's timezone.
   * @param instant - The instant, or none.
   * @returns The day, as the date control takes it; empty for none.
   */
  dayOf(data: FleetReportsData, instant: string | undefined): string {
    return instant === undefined ? '' : localDayOf(instant, data.timezone);
  }

  /**
   * Shows the reports over the days the reader picked, each whole.
   *
   * @param data - The page, with the reader's timezone.
   * @param fromDay - The first day, `YYYY-MM-DD`, or empty for no bound.
   * @param toDay - The last day, likewise.
   */
  onSpan(data: FleetReportsData, fromDay: string, toDay: string): void {
    this.navigate({
      from: fromDay === '' ? null : startOfLocalDay(fromDay, data.timezone),
      to: toDay === '' ? null : endOfLocalDay(toDay, data.timezone),
      at: null,
    });
  }

  /** Shows the reports over every export. */
  onEverySpan(): void {
    this.navigate({ from: null, to: null, at: null });
  }

  /**
   * Draws the report's detail at another export.
   *
   * @param importId - The export.
   */
  onAt(importId: string): void {
    this.navigate({ at: importId });
  }

  /**
   * Downloads the report as shown, as CSV.
   *
   * @param data - The page.
   */
  onCsv(data: FleetReportsData): void {
    // The button is drawn only beside a report.
    const report = data.chosen as FleetReport;
    const { communityId, fleetId, tabs } = data.section;
    const day = localDayOf(new Date().toISOString(), data.timezone);

    this.csvState.set('BUSY');
    this._reportService
      .csv(communityId, fleetId, report, data.query)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: file => {
          saveFile(
            file,
            `${tabs.fleetSlug}-${report.toLowerCase()}-${day}.csv`,
          );
          this.csvState.set('IDLE');
        },
        error: () => this.csvState.set('FAILED'),
      });
  }

  /**
   * Reads which reports the reader may see, then the one the address asks
   * for: the first they may see when it names none of them.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns The page.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<FleetReportsData> {
    const request = reportQueryOf(query);
    const timezone = this._settingsService.displayTimezone();

    return this._reportService
      .visible(section.communityId, section.fleetId)
      .pipe(
        switchMap(access => {
          const chosen = chooseReport(access, query.get('report'));
          const base = { access, chosen, query: request, timezone, section };

          if (chosen === null) {
            return of<FleetReportsData>({ ...base, shown: null });
          }

          return this._reportService
            .report(section.communityId, section.fleetId, chosen, request)
            .pipe(map((shown): FleetReportsData => ({ ...base, shown })));
        }),
      );
  }

  /**
   * Changes the address's query, keeping the rest.
   *
   * @param queryParams - What to change; null removes it.
   */
  private navigate(queryParams: Record<string, string | null>): void {
    this.csvState.set('IDLE');
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}

/**
 * Reads the span and detail export the address asks for.
 *
 * @param query - The address's query.
 * @returns The request, with nothing the address leaves out.
 */
export function reportQueryOf(query: ParamMap): FleetReportQuery {
  const request: { from?: string; to?: string; at?: string } = {};

  for (const key of ['from', 'to', 'at'] as const) {
    const value = query.get(key);

    if (value !== null && value !== '') {
      request[key] = value;
    }
  }

  return request;
}

/**
 * Chooses the report to read.
 *
 * @param access - The reports the reader may see.
 * @param asked - The report the address names, in any case, if any.
 * @returns It, when the reader may see it; otherwise the first they may,
 *   in the order reports are offered; null when they may see none.
 */
export function chooseReport(
  access: readonly FleetReportAccess[],
  asked: string | null,
): FleetReport | null {
  const visible = FLEET_REPORTS.filter(report =>
    access.some(entry => entry.report === report),
  );
  const named = visible.find(report => report === asked?.toUpperCase());

  return named ?? visible[0] ?? null;
}
