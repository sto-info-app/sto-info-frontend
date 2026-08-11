import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Observable, finalize, take } from 'rxjs';
import {
  ModeratedUser,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_PILL_CLASSES,
  ReportStatus,
  UserReport,
} from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

const PAGE_SIZE = 20;
const LOAD_TIMEOUT_MS = 12000;

/** The status filter options, with "everything" as the leading choice. */
type StatusFilter = ReportStatus | 'ALL';

/**
 * The moderation queue: reports members have raised about other members, with
 * the actions that close them.
 *
 * Reports arrive oldest first from the API so the longest-waiting complaint is
 * dealt with first, and the filter defaults to the unresolved ones — the
 * queue's job is what still needs a decision, not the whole history.
 */
@Component({
  selector: 'app-report-admin-list',
  templateUrl: './report-admin-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './moderation-admin.component.scss',
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class ReportAdminListComponent implements OnInit {
  private readonly _moderationService = inject(ModerationService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  appRoutes = APP_ROUTES;
  reportStatus = ReportStatus;
  reasonLabels = REPORT_REASON_LABELS;
  statusLabels = REPORT_STATUS_LABELS;
  statusPillClasses = REPORT_STATUS_PILL_CLASSES;
  statusFilters: StatusFilter[] = ['ALL', ...Object.values(ReportStatus)];

  reports: UserReport[] = [];
  openCount = 0;
  statusFilter: StatusFilter = ReportStatus.OPEN;
  search = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  /**
   * Loads the open reports on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads the queue for the current filter.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.reports = [];
        this.errorMessage =
          'Loading reports is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this._moderationService
      .getReports({
        status: this.statusFilter === 'ALL' ? undefined : this.statusFilter,
        search: this.search.trim() || undefined,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.reports = Array.isArray(result?.items) ? result.items : [];
          this.openCount = result?.openCount ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load reports.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Reloads the queue after the filter or search term changes.
   */
  applyFilters(): void {
    this.successMessage = '';
    this.load();
  }

  /**
   * The label shown for a status filter option.
   *
   * @param filter - The filter option.
   * @returns Its display label.
   */
  filterLabel(filter: StatusFilter): string {
    return filter === 'ALL' ? 'All reports' : this.statusLabels[filter];
  }

  /**
   * Claims a report for review, so other administrators can see it is being
   * looked at.
   *
   * @param report - The report to claim.
   */
  claim(report: UserReport): void {
    this.setStatus(
      report,
      ReportStatus.UNDER_REVIEW,
      `Report about ${this.reportedName(report)} marked as under review.`,
    );
  }

  /**
   * Closes a report without action against the reported member.
   *
   * @param report - The report to dismiss.
   */
  dismiss(report: UserReport): void {
    this.confirm(
      {
        title: 'Dismiss Report',
        message: `
          <p>Dismiss the report about
          <strong>${this.reportedName(report)}</strong>?</p>
          <p>The report is closed with no action taken. Neither member is
          told.</p>`,
        confirmText: 'Dismiss',
      },
      () =>
        this.setStatus(
          report,
          ReportStatus.DISMISSED,
          `Report about ${this.reportedName(report)} dismissed.`,
        ),
    );
  }

  /**
   * Closes a report as upheld, without touching the reported member's account.
   *
   * Kept separate from disabling: not every upheld report warrants locking an
   * account, and a warning given elsewhere still needs the report closing.
   *
   * @param report - The report to uphold.
   */
  markActioned(report: UserReport): void {
    this.setStatus(
      report,
      ReportStatus.ACTIONED,
      `Report about ${this.reportedName(report)} closed as actioned.`,
    );
  }

  /**
   * Disables the reported member's account.
   *
   * The server ends their sessions and closes every unresolved report naming
   * them, so the queue reflects the outcome without further clicks.
   *
   * @param report - The report whose subject is being disabled.
   */
  disableReported(report: UserReport): void {
    const name = this.reportedName(report);

    this.confirm(
      {
        title: 'Disable Account',
        message: `
          <p>Disable <strong>${name}</strong>?</p>
          <p>They are signed out immediately and cannot sign in again, their
          record leaves the registry, and every open report about them is
          closed as actioned.</p>
          <p><strong>WARNING:</strong> They are not told why.</p>`,
        confirmText: 'Disable',
      },
      () =>
        this.runAction(
          () => this._moderationService.disableUser(report.reported.userId),
          `${name}'s account was disabled.`,
          'Failed to disable that account.',
        ),
    );
  }

  /**
   * Restores the reported member's disabled account.
   *
   * @param report - The report whose subject is being restored.
   */
  enableReported(report: UserReport): void {
    const name = this.reportedName(report);

    this.confirm(
      {
        title: 'Restore Account',
        message: `
          <p>Restore <strong>${name}</strong>?</p>
          <p>They can sign in again and their record returns to the registry.
          Reports already closed against them stay closed.</p>`,
        confirmText: 'Restore',
      },
      () =>
        this.runAction(
          () => this._moderationService.enableUser(report.reported.userId),
          `${name}'s account was restored.`,
          'Failed to restore that account.',
        ),
    );
  }

  /**
   * How a member is named in the queue: their username, or their user ID when
   * they never set one.
   *
   * @param report - The report.
   * @returns The reported member's display name.
   */
  reportedName(report: UserReport): string {
    return report.reported.username ?? report.reported.userId;
  }

  /**
   * How the reporter is named in the queue.
   *
   * @param report - The report.
   * @returns The reporting member's display name.
   */
  reporterName(report: UserReport): string {
    return report.reporter.username ?? report.reporter.userId;
  }

  // ----- Helpers -----

  /**
   * Moves a report into a new state and replaces it in the list.
   *
   * @param report - The report to update.
   * @param status - The state to move it into.
   * @param successMessage - Copy shown when it succeeds.
   */
  private setStatus(
    report: UserReport,
    status: ReportStatus,
    successMessage: string,
  ): void {
    this.runAction(
      () => this._moderationService.updateReport(report.id, { status }),
      successMessage,
      'Failed to update that report.',
    );
  }

  /**
   * Runs a queue action and reloads, so the list and the unresolved count both
   * reflect what the server actually did — a disable, in particular, closes
   * reports this page never touched.
   *
   * @param action - Builds the request to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   */
  private runAction(
    action: () => Observable<UserReport | ModeratedUser>,
    successMessage: string,
    failureMessage: string,
  ): void {
    this.errorMessage = '';
    this.successMessage = '';

    action()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: () => {
          this.successMessage = successMessage;
          this.load();
        },
        error: () => (this.errorMessage = failureMessage),
      });
  }

  /**
   * Opens the LCARS confirmation dialog and runs the action if confirmed.
   *
   * @param data - The dialog copy.
   * @param onConfirm - Invoked when the administrator confirms.
   */
  private confirm(
    data: { title: string; message: string; confirmText: string },
    onConfirm: () => void,
  ): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: { ...data, cancelText: 'Cancel' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }
}
