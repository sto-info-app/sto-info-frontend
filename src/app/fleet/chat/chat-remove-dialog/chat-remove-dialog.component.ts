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

import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';

/** What the removal dialog is opened with. */
export interface ChatRemoveDialogData {
  /** Whose message it is. */
  readonly authorName: string;
}

/** The longest reason, as the server allows. */
const REASON_MAX = 500;

/**
 * Asks a moderator why they are removing somebody else's message (FC-033).
 * The reason is logged with the removal; closes with it, or undefined when
 * cancelled.
 */
@Component({
  selector: 'app-chat-remove-dialog',
  templateUrl: './chat-remove-dialog.component.html',
  styleUrls: ['./chat-remove-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, LcarsWarningMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatRemoveDialogComponent {
  readonly data: ChatRemoveDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatRemoveDialogComponent, string>,
  );

  readonly reasonMax = REASON_MAX;
  readonly reason = signal('');

  /** Whether a reason has been given. */
  readonly isValid = computed(() => this.reason().trim().length > 0);

  /**
   * Sets the reason as typed.
   *
   * @param value - The reason.
   */
  protected setReason(value: string): void {
    this.reason.set(value);
  }

  /** Closes with the reason. */
  protected remove(): void {
    if (this.isValid()) {
      this._dialogRef.close(this.reason().trim());
    }
  }

  /** Closes without removing anything. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
