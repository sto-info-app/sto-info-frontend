import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { reportChartOf } from 'src/app/fleet/fleet-reports/report-chart.utils';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import {
  FleetRanksReport,
  RanksExport,
} from 'src/app/models/fleet-report.models';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** A rank label as a column: its name, and its tier in the rank order. */
export interface RankColumn {
  readonly label: string;
  readonly tier: number | null;
}

/**
 * A Fleet's members by rank, export by export (FC-020).
 *
 * The labels are ordered by the Fleet's rank order as it stands now, with
 * the labels it has not placed last. Beside them, the rank changes each
 * export revealed: a move between two placed tiers is a promotion or a
 * demotion, and every other change of label is only a change. The chart
 * draws the latest export in the span.
 */
@Component({
  selector: 'app-ranks-report',
  templateUrl: './ranks-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, ReportFigurePipe, SmartChartComponent],
})
export class RanksReportComponent {
  /** The report. */
  readonly report = input.required<FleetRanksReport>();

  /** The latest export in the span, which the chart draws. */
  readonly latest = computed(() => this.report().exports.at(-1) ?? null);

  /**
   * Every label any export in the span listed, in rank order: placed tiers
   * first, highest first, then the rest as the exports first listed them.
   */
  readonly columns = computed((): RankColumn[] => {
    const seen = new Map<string, RankColumn>();

    for (const entry of this.report().exports) {
      for (const { label, tier } of entry.labels) {
        if (!seen.has(label)) {
          seen.set(label, { label, tier });
        }
      }
    }

    return [...seen.values()].sort(
      (a, b) =>
        (a.tier ?? Number.POSITIVE_INFINITY) -
        (b.tier ?? Number.POSITIVE_INFINITY),
    );
  });

  /** The latest export's labels. */
  readonly chart = computed(() => {
    const latest = this.latest();

    return reportChartOf(
      (latest?.labels ?? []).map(entry => ({
        name: entry.label,
        value: entry.members,
      })),
    );
  });

  /**
   * How many members an export listed under a label.
   *
   * @param entry - The export.
   * @param label - The label.
   * @returns The count; null when hidden; 0 when the export listed nobody
   *   under it.
   */
  membersUnder(entry: RanksExport, label: string): number | null {
    const found = entry.labels.find(candidate => candidate.label === label);

    return found === undefined ? 0 : found.members;
  }
}
