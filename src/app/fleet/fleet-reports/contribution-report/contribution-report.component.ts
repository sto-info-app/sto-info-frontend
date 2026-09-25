import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';

import { reportChartOf } from 'src/app/fleet/fleet-reports/report-chart.utils';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetContributionReport } from 'src/app/models/fleet-report.models';
import { RosterChangeKind } from 'src/app/models/fleet-roster.models';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * What a Fleet's members contributed, interval by interval (FC-020).
 *
 * Only ever the rise between two consecutive exports: nothing is spread
 * over the days or weeks between them, a fall is a reset rather than a
 * negative gift, and nothing says what was given. A full view also lists,
 * for one interval, each member's rise, largest first, then each reset.
 * The chart draws each interval's total.
 */
@Component({
  selector: 'app-contribution-report',
  templateUrl: './contribution-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [AppDatePipe, ReportFigurePipe, SmartChartComponent],
})
export class ContributionReportComponent {
  private readonly _datePipe = inject(AppDatePipe);

  readonly reset = RosterChangeKind.CONTRIBUTION_RESET;

  /** The report. */
  readonly report = input.required<FleetContributionReport>();

  /** Asks for the rises in another interval, by the import ending it. */
  readonly atChange = output<string>();

  /** Each interval's total rise, oldest first. */
  readonly chart = computed(() =>
    reportChartOf(
      this.report().intervals.map(interval => ({
        // An instant the server sent always formats.
        name: this._datePipe.transform(interval.to.exportedAt) as string,
        value: interval.contributionDelta,
      })),
    ),
  );

  /** The intervals a reader can list the rises in, newest first. */
  readonly choices = computed(() => [...this.report().intervals].reverse());
}
