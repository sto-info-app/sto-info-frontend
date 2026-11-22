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

import { ChatReportDecision } from 'src/app/models/fleet-chat.models';
import { ReportStatus } from 'src/app/models/moderation.models';

/** What the decision dialog is opened with. */
export interface ChatReportDecisionDialogData {
  readonly status: ChatReportDecision['status'];
  /** Whose message was reported. */
  readonly authorName: string;
}

/** The longest note, as the server allows. */
const NOTE_MAX = 1000;

/**
 * Closes a chat report as resolved or dismissed, with a note (FC-035). The
 * note is required: it is the decision's reason in the site admin log
 * (FC-039). The reporter is never told. Closes with the decision, or
 * undefined when cancelled.
 */
@Component({
  selector: 'app-chat-report-decision-dialog',
  templateUrl: './chat-report-decision-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatReportDecisionDialogComponent {
  readonly data: ChatReportDecisionDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatReportDecisionDialogComponent, ChatReportDecision>,
  );

  readonly noteMax = NOTE_MAX;
  readonly note = signal('');
  readonly isResolving = this.data.status === ReportStatus.ACTIONED;

  /** Whether a note has been written. */
  readonly isValid = computed(() => this.note().trim().length > 0);

  /**
   * Sets the note as typed.
   *
   * @param value - The note.
   */
  protected setNote(value: string): void {
    this.note.set(value);
  }

  /** Closes with the decision, once there is a note. */
  protected confirm(): void {
    if (this.isValid()) {
      this._dialogRef.close({
        status: this.data.status,
        note: this.note().trim(),
      });
    }
  }

  /** Closes without deciding. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
