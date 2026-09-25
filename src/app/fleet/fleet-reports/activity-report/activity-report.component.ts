import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  ACTIVITY_BAND_LABELS,
  ACTIVITY_BANDS,
} from 'src/app/fleet/fleet-reports/fleet-report.text';
import { reportChartOf } from 'src/app/fleet/fleet-reports/report-chart.utils';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetActivityReport } from 'src/app/models/fleet-report.models';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * How recently a Fleet's members had been active, export by export
 * (FC-020).
 *
 * Imported Last Active only, measured back from each export's own instant;
 * nothing is inferred from anything else. The chart draws the latest export
 * in the span.
 */
@Component({
  selector: 'app-activity-report',
  templateUrl: './activity-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, ReportFigurePipe, SmartChartComponent],
})
export class ActivityReportComponent {
  readonly bands = ACTIVITY_BANDS;
  readonly bandLabels = ACTIVITY_BAND_LABELS;

  /** The report. */
  readonly report = input.required<FleetActivityReport>();

  /** The latest export in the span, which the chart draws. */
  readonly latest = computed(() => this.report().exports.at(-1) ?? null);

  /** The latest export's bands. */
  readonly chart = computed(() => {
    const latest = this.latest();

    return reportChartOf(
      latest === null
        ? []
        : ACTIVITY_BANDS.map(band => ({
            name: ACTIVITY_BAND_LABELS[band],
            value: latest.bands[band],
          })),
    );
  });
}
