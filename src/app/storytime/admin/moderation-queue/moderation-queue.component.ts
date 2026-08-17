import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';
import {
  AppealStatus,
  ModerationAppeal,
  StorytimeReport,
  StorytimeReportStatus,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { REPORT_REASON_LABELS } from '../../storytime.constants';

/**
 * The Storytime moderation queue: what has been reported, and who has appealed.
 *
 * Both lists sit on one page because they are the same job seen from two
 * sides, and an administrator who has just removed something is the person
 * best placed to read the appeal against it.
 *
 * Removing content asks for a message and sends it to the creator word for
 * word. That is deliberate friction: a removal nobody can explain is a removal
 * nobody can appeal.
 */
@Component({
  selector: 'app-moderation-queue',
  templateUrl: './moderation-queue.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ModerationQueueComponent implements OnInit {
  /** The reports in the queue. */
  reports: StorytimeReport[] = [];

  /** The appeals waiting on a decision. */
  appeals: ModerationAppeal[] = [];

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Report states, for the actions offered on each. */
  readonly reportStatus = StorytimeReportStatus;

  /** Appeal states. */
  readonly appealStatus = AppealStatus;

  /** How each report reason reads. */
  readonly reasonLabels = REPORT_REASON_LABELS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _moderationService = inject(StorytimeModerationService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  /** What an administrator is saying about the report they are working on. */
  readonly form = this._formBuilder.nonNullable.group({
    message: [''],
    resolution: [''],
  });

  /**
   * Loads both queues together.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether a report is still being worked on.
   *
   * @param report - The report.
   * @returns True while it is open or under review.
   */
  isLive(report: StorytimeReport): boolean {
    return (
      report.status === StorytimeReportStatus.OPEN ||
      report.status === StorytimeReportStatus.UNDER_REVIEW
    );
  }

  /**
   * Claims a report, so the queue shows somebody is on it.
   *
   * @param report - The report.
   */
  claim(report: StorytimeReport): void {
    this.runAction(
      this._moderationService.resolveReport(report.id, {
        status: StorytimeReportStatus.UNDER_REVIEW,
      }),
    );
  }

  /**
   * Removes the content a report is about, and closes the report.
   *
   * @param report - The report.
   */
  removeContent(report: StorytimeReport): void {
    const message = this.form.getRawValue().message.trim();

    if (!message) {
      this.errorMessage =
        'Say what the creator is being told. They are shown it word for word.';
      return;
    }

    this.runAction(
      this._moderationService.removeContent({
        targetType: report.targetType,
        targetId: report.targetId,
        reasonCode: report.reasonCode,
        message,
      }),
      () =>
        this._moderationService
          .resolveReport(report.id, {
            status: StorytimeReportStatus.ACTIONED,
            resolution: message,
          })
          .pipe(takeUntilDestroyed(this._destroyRef))
          .subscribe(),
    );
  }

  /**
   * Closes a report without acting on the content.
   *
   * @param report - The report.
   */
  dismiss(report: StorytimeReport): void {
    this.runAction(
      this._moderationService.resolveReport(report.id, {
        status: StorytimeReportStatus.DISMISSED,
        resolution: this.form.getRawValue().resolution.trim() || undefined,
      }),
    );
  }

  /**
   * Upholds an appeal, which puts the content back.
   *
   * @param appeal - The appeal.
   */
  uphold(appeal: ModerationAppeal): void {
    this.decide(appeal, true);
  }

  /**
   * Turns down an appeal, leaving the removal standing.
   *
   * @param appeal - The appeal.
   */
  reject(appeal: ModerationAppeal): void {
    this.decide(appeal, false);
  }

  /**
   * Decides an appeal either way.
   *
   * @param appeal - The appeal.
   * @param uphold - Whether it succeeds.
   */
  private decide(appeal: ModerationAppeal, uphold: boolean): void {
    this.runAction(
      this._moderationService.decideAppeal(appeal.id, {
        uphold,
        reviewNotes: this.form.getRawValue().message.trim() || undefined,
      }),
    );
  }

  /**
   * Runs an action, then reloads so both queues reflect what the server did.
   *
   * @param action - The action to run.
   * @param onSuccess - Anything else to do once it succeeds.
   */
  private runAction(action: Observable<unknown>, onSuccess?: () => void): void {
    this.isLoading = true;
    this.errorMessage = '';

    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        onSuccess?.();
        this.form.reset();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'That could not be saved. Please try again shortly.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads the reports and the appeals.
   */
  private load(): void {
    this.isLoading = true;

    forkJoin({
      reports: this._moderationService.getReports(),
      appeals: this._moderationService.getAppeals(AppealStatus.SUBMITTED),
    })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: queue => {
          this.reports = queue.reports;
          this.appeals = queue.appeals;
        },
        error: () => {
          this.errorMessage =
            'The moderation queue could not be loaded. Please try again shortly.';
        },
      });
  }
}
