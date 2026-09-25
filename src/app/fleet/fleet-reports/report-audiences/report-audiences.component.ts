import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  FLEET_REPORT_AUDIENCE_LABELS,
  FLEET_REPORT_AUDIENCES,
  FLEET_REPORT_LABELS,
} from 'src/app/fleet/fleet-reports/fleet-report.text';
import { FleetAudience } from 'src/app/models/fleet.models';
import {
  FleetReport,
  FleetReportAudience,
  FleetReportAudiences,
} from 'src/app/models/fleet-report.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when the audiences could not be read. */
export const REPORT_AUDIENCES_ERROR =
  'Who sees each report could not be read. Please try again.';

/** What to say when an audience could not be changed. */
export const REPORT_AUDIENCE_SAVE_FAILED =
  'That audience could not be changed. Please try again.';

/** What the panel is showing. */
export type ReportAudiencesState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly audiences: FleetReportAudiences };

/**
 * Who sees each of a Fleet's reports, and every change to it (FC-020).
 *
 * For the Owner and Admins, who hold `reports.view`. The Owner alone, who
 * holds `scope.settings.manage`, may change an audience: a choice is only
 * made once they press Save beside it, since showing a report to anyone is
 * not a thing to do by moving a select. Each change is kept, from what to
 * what and by whom, newest first.
 */
@Component({
  selector: 'app-report-audiences',
  templateUrl: './report-audiences.component.html',
  styleUrls: ['./report-audiences.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe],
})
export class ReportAudiencesComponent implements OnInit {
  private readonly _reportService = inject(FleetReportService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly errorMessage = REPORT_AUDIENCES_ERROR;
  readonly saveFailedMessage = REPORT_AUDIENCE_SAVE_FAILED;
  readonly audienceChoices = FLEET_REPORT_AUDIENCES;
  readonly audienceLabels = FLEET_REPORT_AUDIENCE_LABELS;
  readonly reportLabels = FLEET_REPORT_LABELS;

  /** The Community holding the Fleet. */
  readonly communityId = input.required<string>();
  readonly fleetId = input.required<string>();
  /** Whether the reader may change an audience: the Owner alone. */
  readonly canEdit = input(false);

  /** What the panel is showing. */
  readonly state = signal<ReportAudiencesState>({ kind: 'LOADING' });

  /** The audience picked for each report and not yet saved. */
  readonly drafts = signal<Partial<Record<FleetReport, FleetAudience>>>({});

  /** The report whose audience is being saved, if any. */
  readonly saving = signal<FleetReport | null>(null);

  /** Whether the last save failed. */
  readonly saveFailed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  /** Reads every report's audience and every change to one. */
  load(): void {
    this.state.set({ kind: 'LOADING' });
    this._reportService
      .audiences(this.communityId(), this.fleetId())
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: audiences => this.state.set({ kind: 'READY', audiences }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * The audience a report's select shows: the one picked, or the one it has.
   *
   * @param entry - The report's audience now.
   * @returns The audience.
   */
  shownAudience(entry: FleetReportAudience): FleetAudience {
    return this.drafts()[entry.report] ?? entry.audience;
  }

  /**
   * Whether a report has an audience picked that it does not have yet.
   *
   * @param entry - The report's audience now.
   * @returns True when Save would change it.
   */
  isChanged(entry: FleetReportAudience): boolean {
    return this.shownAudience(entry) !== entry.audience;
  }

  /**
   * Picks an audience for a report, to be saved.
   *
   * @param report - The report.
   * @param audience - The audience picked.
   */
  onPick(report: FleetReport, audience: string): void {
    this.drafts.update(drafts => ({
      ...drafts,
      [report]: audience as FleetAudience,
    }));
  }

  /**
   * Saves the audience picked for a report.
   *
   * @param entry - The report's audience now.
   */
  onSave(entry: FleetReportAudience): void {
    const audience = this.shownAudience(entry);

    this.saving.set(entry.report);
    this.saveFailed.set(false);
    this._reportService
      .setAudience(this.communityId(), this.fleetId(), entry.report, audience)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: audiences => {
          this.state.set({ kind: 'READY', audiences });
          this.drafts.update(drafts => {
            const rest = { ...drafts };

            delete rest[entry.report];

            return rest;
          });
          this.saving.set(null);
        },
        error: () => {
          this.saving.set(null);
          this.saveFailed.set(true);
        },
      });
  }
}
