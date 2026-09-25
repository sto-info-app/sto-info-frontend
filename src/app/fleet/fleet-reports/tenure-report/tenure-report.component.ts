import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  TENURE_BAND_LABELS,
  TENURE_BANDS,
} from 'src/app/fleet/fleet-reports/fleet-report.text';
import { reportChartOf } from 'src/app/fleet/fleet-reports/report-chart.utils';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetTenureReport } from 'src/app/models/fleet-report.models';
import { RosterExportRef } from 'src/app/models/fleet-roster.models';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * How long a Fleet's members had been listed, export by export (FC-020).
 *
 * Observed tenure, never the game's Join Date: from the export that first
 * listed a member's current stretch. When no earlier export bounds that
 * stretch, they had been listed at least that long, and each band says how
 * many of its members that is. A full view also lists the members at one
 * export, longest listed first; the chart draws the same export.
 */
@Component({
  selector: 'app-tenure-report',
  templateUrl: './tenure-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, ReportFigurePipe, SmartChartComponent],
})
export class TenureReportComponent {
  readonly bands = TENURE_BANDS;
  readonly bandLabels = TENURE_BAND_LABELS;

  /** The report. */
  readonly report = input.required<FleetTenureReport>();

  /** Asks for the members at another export, by its import. */
  readonly atChange = output<string>();

  /** The export the chart draws: the detail's, or the latest in the span. */
  readonly snapshot = computed(() => {
    const report = this.report();

    return (
      report.exports.find(
        entry => entry.export.importId === report.at?.importId,
      ) ??
      report.exports.at(-1) ??
      null
    );
  });

  /** The snapshot's bands. */
  readonly chart = computed(() => {
    const snapshot = this.snapshot();

    return reportChartOf(
      snapshot === null
        ? []
        : TENURE_BANDS.map(band => ({
            name: TENURE_BAND_LABELS[band],
            value: snapshot.bands[band],
          })),
    );
  });

  /** The exports a reader can list the members at, newest first. */
  readonly choices = computed((): RosterExportRef[] =>
    this.report()
      .exports.map(entry => entry.export)
      .reverse(),
  );
}
