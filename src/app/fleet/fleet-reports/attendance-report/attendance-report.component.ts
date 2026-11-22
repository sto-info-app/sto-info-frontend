import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetAttendanceReport } from 'src/app/models/fleet-report.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * Who came to the Fleet's own events (FC-030).
 *
 * Each occurrence that started in the span, how many were going, and how
 * many were recorded as coming or not, with the rate. The Owner and Admins
 * also see each person; anybody else sees counts, a small one hidden.
 */
@Component({
  selector: 'app-attendance-report',
  templateUrl: './attendance-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, ReportFigurePipe],
})
export class AttendanceReportComponent {
  readonly report = input.required<FleetAttendanceReport>();

  /**
   * A rate as a percentage.
   *
   * @param rate - 0 to 1, or null where it is not shown.
   * @returns Such as "83%", or a dash.
   */
  percent(rate: number | null): string {
    return rate === null ? '–' : `${Math.round(rate * 100)}%`;
  }
}
