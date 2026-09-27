import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { GOVERNANCE_REASON_LIMIT } from 'src/app/fleet/governance/governance.constants';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';

/** What the dialog asks about. */
export interface GovernanceCloseDialogData {
  /** "Community" or "Fleet". */
  readonly scopeNoun: string;
  /** The name to be typed back, exactly as recorded. */
  readonly name: string;
  /** Whether a site administrator is closing it rather than its Owner. */
  readonly asSiteAdmin: boolean;
}

/** The answer the dialog closes with when the reader goes ahead. */
export interface GovernanceCloseDialogResult {
  /** Trimmed, and never empty. */
  readonly reason: string;
}

/** What closing does, whoever closes it. */
export const GOVERNANCE_CLOSE_WARNING =
  '<p>Closing cannot be undone: nothing here reopens a closed record.</p>' +
  '<p>Every role and delegated capability here ends with it. Its history, ' +
  'members and pictures are kept.</p>';

/**
 * Asks for a Community or Fleet to be closed, and why (FC-022).
 *
 * Closing cannot be undone, so the reader types the name back as well as
 * giving a reason. The name is compared with its edge spaces trimmed from
 * both sides, since nobody can see a trailing space to type it; anything
 * else must match exactly, capitals included.
 */
@Component({
  selector: 'app-governance-close-dialog',
  templateUrl: './governance-close-dialog.component.html',
  styleUrls: ['./governance-close-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, LcarsWarningMessageComponent],
})
export class GovernanceCloseDialogComponent {
  /** What the dialog asks about. */
  readonly data: GovernanceCloseDialogData = inject(MAT_DIALOG_DATA);

  private readonly _dialogRef =
    inject<
      MatDialogRef<GovernanceCloseDialogComponent, GovernanceCloseDialogResult>
    >(MatDialogRef);
  private readonly _fb = inject(FormBuilder);

  readonly warning = GOVERNANCE_CLOSE_WARNING;
  readonly maxLength = GOVERNANCE_REASON_LIMIT;

  readonly form = this._fb.nonNullable.group({
    name: ['', [this.matchesName.bind(this)]],
    reason: [
      '',
      [Validators.required, Validators.maxLength(GOVERNANCE_REASON_LIMIT)],
    ],
  });

  /**
   * Closes it, if the name was typed back and a reason given.
   *
   * Only white space is no reason at all, which is how the server reads it
   * too, so a reason made of spaces is refused here first.
   */
  onConfirm(): void {
    const reason = this.form.controls.reason.value.trim();

    if (!reason) {
      this.form.controls.reason.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this._dialogRef.close({ reason });
  }

  /** Closes the dialog without closing anything else. */
  onCancel(): void {
    this._dialogRef.close();
  }

  /**
   * Whether the name typed is the one being closed.
   *
   * @param control - The name field.
   * @returns An error unless it matches.
   */
  private matchesName(
    control: AbstractControl<string>,
  ): ValidationErrors | null {
    return control.value.trim() === this.data.name.trim()
      ? null
      : { mismatch: true };
  }
}
