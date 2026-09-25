import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { reportChartOf } from 'src/app/fleet/fleet-reports/report-chart.utils';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetGrowthReport } from 'src/app/models/fleet-report.models';
import { SmartChartComponent } from 'src/app/shared/components/smart-chart/smart-chart.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * A Fleet's growth and loss, interval by interval (FC-020).
 *
 * Each interval runs between two consecutive effective exports and is dated
 * by them alone, so nothing here says when anybody joined or left more
 * exactly than that. Beside the members, the account handles each end
 * listed: observed accounts, never people. The chart draws the members at
 * the end of each interval.
 */
@Component({
  selector: 'app-growth-report',
  templateUrl: './growth-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [AppDatePipe, ReportFigurePipe, SmartChartComponent],
})
export class GrowthReportComponent {
  private readonly _datePipe = inject(AppDatePipe);

  /** The report. */
  readonly report = input.required<FleetGrowthReport>();

  /** The members at the end of each interval, oldest first. */
  readonly chart = computed(() =>
    reportChartOf(
      this.report().intervals.map(interval => ({
        // An instant the server sent always formats.
        name: this._datePipe.transform(interval.to.exportedAt) as string,
        value: interval.membersAtEnd,
      })),
    ),
  );
}
