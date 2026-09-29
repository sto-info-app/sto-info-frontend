import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { ChatReportInput } from 'src/app/models/fleet-chat.models';
import {
  REPORT_REASON_LABELS,
  ReportReason,
} from 'src/app/models/moderation.models';

/** What the report dialog is opened with. */
export interface ChatReportDialogData {
  /** Whose message it is. */
  readonly authorName: string;
}

/** The longest details, as the server allows. */
const DETAILS_MAX = 1000;

/**
 * Asks a reader why they are reporting a message (FC-035), with the member
 * reports' reasons, and details that "Something else" needs. Closes with the
 * report, or undefined when cancelled.
 */
@Component({
  selector: 'app-chat-report-dialog',
  templateUrl: './chat-report-dialog.component.html',
  styleUrls: ['./chat-report-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatReportDialogComponent {
  readonly data: ChatReportDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatReportDialogComponent, ChatReportInput>,
  );

  readonly detailsMax = DETAILS_MAX;
  readonly reasons = Object.values(ReportReason);
  readonly reasonLabels = REPORT_REASON_LABELS;
  readonly reason = signal(ReportReason.HARASSMENT);
  readonly details = signal('');

  /** Whether the reason leaves the details to do the explaining. */
  readonly needsDetails = computed(() => this.reason() === ReportReason.OTHER);

  /** Whether the report may be sent. */
  readonly isValid = computed(
    () => !this.needsDetails() || this.details().trim().length > 0,
  );

  /**
   * Sets the reason as chosen.
   *
   * @param value - The reason.
   */
  protected setReason(value: string): void {
    this.reason.set(value as ReportReason);
  }

  /**
   * Sets the details as typed.
   *
   * @param value - The details.
   */
  protected setDetails(value: string): void {
    this.details.set(value);
  }

  /** Closes with the report. */
  protected send(): void {
    if (!this.isValid()) {
      return;
    }

    const details = this.details().trim();

    this._dialogRef.close({
      reason: this.reason(),
      ...(details ? { details } : {}),
    });
  }

  /** Closes without reporting. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
