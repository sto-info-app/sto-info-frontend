import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';

/** The longest reason the server keeps. */
export const ROSTER_IDENTITY_REASON_MAX_LENGTH = 500;

/** What the dialog asks about. */
export interface RosterIdentityDecisionDialogData {
  title: string;

  /** What will happen, as trusted markup: never a name a roster supplied. */
  message: string;
  confirmText: string;

  /** Whether a reason must be given. An undo must say why. */
  reasonRequired: boolean;
}

/** The answer the dialog closes with when the reviewer goes ahead. */
export interface RosterIdentityDecisionDialogResult {
  /** Trimmed, and absent where none was given. */
  reason?: string;
}

/**
 * Asks a reviewer to go ahead with a decision on a rename, and why.
 *
 * The confirmation dialog's look, with a reason beneath it. Confirming and
 * rejecting may say why and need not; an undo reverses what somebody else may
 * have decided, so it must.
 */
@Component({
  selector: 'app-roster-identity-decision-dialog',
  templateUrl: './roster-identity-decision-dialog.component.html',
  styleUrls: ['./roster-identity-decision-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, LcarsWarningMessageComponent],
})
export class RosterIdentityDecisionDialogComponent {
  /** What the dialog asks about. */
  readonly data: RosterIdentityDecisionDialogData = inject(MAT_DIALOG_DATA);

  private readonly _dialogRef =
    inject<
      MatDialogRef<
        RosterIdentityDecisionDialogComponent,
        RosterIdentityDecisionDialogResult
      >
    >(MatDialogRef);
  private readonly _fb = inject(FormBuilder);

  /** The longest reason the server keeps. */
  readonly maxLength = ROSTER_IDENTITY_REASON_MAX_LENGTH;

  readonly form = this._fb.nonNullable.group({
    reason: ['', [Validators.maxLength(ROSTER_IDENTITY_REASON_MAX_LENGTH)]],
  });

  /**
   * Goes ahead, closing with the reason.
   *
   * Only white space is no reason at all, which is how the server reads it
   * too, so a required reason made of spaces is refused here first.
   */
  onConfirm(): void {
    const control = this.form.controls.reason;
    const reason = control.value.trim();

    if (this.data.reasonRequired && !reason) {
      control.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this._dialogRef.close(reason ? { reason } : {});
  }

  /** Closes without deciding anything. */
  onCancel(): void {
    this._dialogRef.close();
  }
}
