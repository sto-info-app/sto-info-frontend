import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RECRUITMENT_ROUTE_LABELS } from 'src/app/fleet/fleet-reports/fleet-report.text';
import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { FleetRecruitmentReport } from 'src/app/models/fleet-report.models';

/**
 * How the Fleet's applications and invitations turned out (FC-030).
 *
 * Month by month and route by route: how many came in, how each ended, and
 * the median days to a decision. Counts only, never a name; anybody but its
 * members sees a small count hidden.
 */
@Component({
  selector: 'app-recruitment-report',
  templateUrl: './recruitment-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReportFigurePipe],
})
export class RecruitmentReportComponent {
  readonly report = input.required<FleetRecruitmentReport>();

  readonly routeLabels = RECRUITMENT_ROUTE_LABELS;

  /**
   * Names a month.
   *
   * @param month - YYYY-MM.
   * @returns Such as "March 2026".
   */
  monthName(month: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${month}-01T00:00:00Z`));
  }
}
