import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import { Observable, take } from 'rxjs';

import { chatAuthorName } from 'src/app/fleet/chat/chat.text';
import { ChatRemoveDialogComponent } from 'src/app/fleet/chat/chat-remove-dialog/chat-remove-dialog.component';
import {
  ChatReportDecision,
  ChatReportDetail,
  ChatReportSummary,
} from 'src/app/models/fleet-chat.models';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_PILL_CLASSES,
  ReportStatus,
} from 'src/app/models/moderation.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';

import { ChatReportAdminService } from './chat-report-admin.service';
import {
  ModerationHoldAdminService,
  ModerationHoldRequest,
} from './moderation-hold-admin.service';
import {
  ChatReportDecisionDialogComponent,
  ChatReportDecisionDialogData,
} from './chat-report-decision-dialog.component';

/** A page of the queue. */
export const CHAT_REPORT_PAGE_SIZE = 20;

/** The status filter's choices: everything, or one status. */
type StatusFilter = ReportStatus | 'ALL';

/** What a scope is called, before its name. */
const SCOPE_LABELS: Readonly<Record<string, string>> = {
  COMMUNITY: 'Community',
  FLEET: 'Fleet',
  ARMADA: 'Armada',
};

/**
 * The site admins' queue of chat reports (FC-035): each reported message,
 * with the twenty before it held as evidence, oldest report first.
 *
 * Steve's decisions of 29 September 2026: an admin resolves or dismisses a
 * report with a note, and may remove the message, which is logged and leaves
 * the evidence as it was. The reporter is never told the outcome. Chat
 * reports never sit under review, so the queue offers open, resolved and
 * dismissed.
 */
@Component({
  selector: 'app-chat-report-admin-list',
  templateUrl: './chat-report-admin-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './moderation-admin.component.scss',
  ],
  standalone: true,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    LoadingBarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatReportAdminListComponent {
  private readonly _reports = inject(ChatReportAdminService);
  private readonly _holds = inject(ModerationHoldAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly appRoutes = APP_ROUTES;
  readonly reportStatus = ReportStatus;
  readonly reasonLabels = REPORT_REASON_LABELS;
  readonly statusLabels = REPORT_STATUS_LABELS;
  readonly statusPillClasses = REPORT_STATUS_PILL_CLASSES;
  readonly statusFilters: StatusFilter[] = [
    ReportStatus.OPEN,
    ReportStatus.ACTIONED,
    ReportStatus.DISMISSED,
    'ALL',
  ];

  readonly reports = signal<ChatReportSummary[]>([]);
  readonly total = signal(0);
  readonly openCount = signal(0);
  readonly page = signal(1);
  readonly statusFilter = signal<StatusFilter>(ReportStatus.OPEN);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  /** Each report whose evidence is shown, by ID. */
  readonly details = signal<ReadonlyMap<string, ChatReportDetail>>(new Map());

  /** How many pages the filter holds. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / CHAT_REPORT_PAGE_SIZE)),
  );

  constructor() {
    this.load();
  }

  /**
   * The label shown for a status filter.
   *
   * @param filter - The filter.
   * @returns Its label.
   */
  protected filterLabel(filter: StatusFilter): string {
    return filter === 'ALL' ? 'All reports' : this.statusLabels[filter];
  }

  /**
   * Filters by status, from the first page.
   *
   * @param value - The filter chosen.
   */
  protected setFilter(value: string): void {
    this.statusFilter.set(value as StatusFilter);
    this.page.set(1);
    this.successMessage.set(null);
    this.load();
  }

  /**
   * Moves to another page.
   *
   * @param step - One back or one on.
   */
  protected turn(step: -1 | 1): void {
    this.page.update(page => page + step);
    this.load();
  }

  /**
   * Names somebody in the queue.
   *
   * @param person - Who, if their account remains.
   * @returns Their username, or a stand-in.
   */
  protected nameOf(person: ChatReportSummary['author']): string {
    return chatAuthorName(person);
  }

  /**
   * Where a reported message was.
   *
   * @param report - The report.
   * @returns The scope and channel, or that it was a direct message.
   */
  protected placeOf(report: ChatReportSummary): string {
    const { place } = report;

    if (place.kind === 'DIRECT') {
      return 'Direct message';
    }

    const channel = `# ${place.channelName ?? 'a removed channel'}`;

    return place.scopeKind === null
      ? channel
      : `${SCOPE_LABELS[place.scopeKind]} ${place.scopeName} · ${channel}`;
  }

  /**
   * Whether a report is still open.
   *
   * @param report - The report.
   * @returns True until it is resolved or dismissed.
   */
  protected isOpen(report: ChatReportSummary): boolean {
    return (
      report.status === ReportStatus.OPEN ||
      report.status === ReportStatus.UNDER_REVIEW
    );
  }

  /**
   * Shows or hides a report's evidence, reading it the first time.
   *
   * @param report - The report.
   */
  protected toggleEvidence(report: ChatReportSummary): void {
    if (this.details().has(report.id)) {
      this.details.update(details => {
        const next = new Map(details);

        next.delete(report.id);

        return next;
      });

      return;
    }

    this.errorMessage.set(null);
    this._reports
      .detail(report.id)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: detail => this.keep(detail),
        error: () => this.errorMessage.set('That report could not be read.'),
      });
  }

  /**
   * Closes a report as resolved or dismissed, with an optional note.
   *
   * @param report - The report.
   * @param status - The outcome.
   */
  protected decide(
    report: ChatReportSummary,
    status: ChatReportDecision['status'],
  ): void {
    const data: ChatReportDecisionDialogData = {
      status,
      authorName: this.nameOf(report.author),
    };

    this._dialog
      .open(ChatReportDecisionDialogComponent, { data })
      .afterClosed()
      .pipe(take(1))
      .subscribe((decision: ChatReportDecision | undefined) => {
        if (decision !== undefined) {
          this.run(
            this._reports.decide(report.id, decision),
            status === ReportStatus.ACTIONED
              ? 'The report was resolved.'
              : 'The report was dismissed.',
            'That report could not be closed.',
          );
        }
      });
  }

  /**
   * Removes the reported message, with a reason for the log.
   *
   * @param report - The report.
   */
  protected removeMessage(report: ChatReportSummary): void {
    this._dialog
      .open(ChatRemoveDialogComponent, {
        data: { authorName: this.nameOf(report.author) },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((reason: string | undefined) => {
        if (reason !== undefined) {
          this.run(
            this._reports.removeMessage(report.id, reason),
            'The message was removed. Its evidence is kept as it was.',
            'That message could not be removed.',
          );
        }
      });
  }

  /**
   * Holds a report's evidence past its 90 days, or everything its author
   * wrote in chat past the 45-day purge, with a reason (FC-036).
   *
   * @param report - The report.
   * @param what - Which.
   */
  protected hold(report: ChatReportSummary, what: 'EVIDENCE' | 'AUTHOR'): void {
    const evidence = what === 'EVIDENCE';
    const data: GovernanceReasonDialogData = {
      title: evidence
        ? 'Hold this report’s evidence'
        : `Hold ${this.nameOf(report.author)}’s messages`,
      message: evidence
        ? 'Its evidence is kept past its 90 days until the hold is released. The hold is reviewed within 180 days.'
        : 'Everything they wrote in chat, in every channel and conversation, is kept past the 45-day purge until the hold is released. The hold is reviewed within 180 days.',
      label: 'Reason',
      confirmText: 'Hold',
      max: 500,
    };

    this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, { data })
      .afterClosed()
      .pipe(take(1))
      .subscribe((reason: string | undefined) => {
        if (reason === undefined) {
          return;
        }

        const request: ModerationHoldRequest = evidence
          ? { kind: 'CHAT_REPORT', chatReportId: report.id, reason }
          : {
              kind: 'MEMBER_MESSAGES',
              subjectUserId: report.author?.userId as string,
              reason,
            };

        this.errorMessage.set(null);
        this.successMessage.set(null);
        this._holds
          .place(request)
          .pipe(take(1), takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: () => {
              this.successMessage.set(
                evidence ? 'Its evidence is held.' : 'Their messages are held.',
              );

              if (evidence && this.details().has(report.id)) {
                this.refresh(report);
              }
            },
            error: (error: { error?: { message?: string } }) =>
              this.errorMessage.set(
                error.error?.message ?? 'That could not be held.',
              ),
          });
      });
  }

  /** Reads the page of the queue the filter and page ask for. */
  private load(): void {
    const status = this.statusFilter();

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._reports
      .list({
        status: status === 'ALL' ? undefined : status,
        page: this.page(),
        pageSize: CHAT_REPORT_PAGE_SIZE,
      })
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          this.reports.set(page.items);
          this.total.set(page.total);
          this.openCount.set(page.openCount);
          this.isLoading.set(false);
        },
        error: () => {
          this.reports.set([]);
          this.errorMessage.set('Chat reports could not be read.');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Runs an action on a report, keeps what came back, and reads the queue
   * again, so its counts are the server's.
   *
   * @param action - The request.
   * @param success - What to say when it works.
   * @param failure - What to say when it does not.
   */
  private run(
    action: Observable<ChatReportDetail>,
    success: string,
    failure: string,
  ): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: detail => {
        this.keep(detail);
        this.successMessage.set(success);
        this.load();
      },
      error: (error: { error?: { message?: string } }) =>
        this.errorMessage.set(error.error?.message ?? failure),
    });
  }

  /**
   * Reads a report's evidence again.
   *
   * @param report - The report.
   */
  private refresh(report: ChatReportSummary): void {
    this._reports
      .detail(report.id)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({ next: detail => this.keep(detail), error: () => undefined });
  }

  /**
   * Keeps a report's evidence to show.
   *
   * @param detail - The report, read in full.
   */
  private keep(detail: ChatReportDetail): void {
    this.details.update(details => new Map(details).set(detail.id, detail));
  }
}
