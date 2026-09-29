import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { FleetHoldingsReport } from 'src/app/models/fleet-report.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * How the Fleet's holdings changed (FC-030).
 *
 * Public, like the Holdings page: every tier a track moved in the span,
 * newest first, and never who recorded it.
 */
@Component({
  selector: 'app-holdings-report',
  templateUrl: './holdings-report.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe],
})
export class HoldingsReportComponent {
  readonly report = input.required<FleetHoldingsReport>();
}
