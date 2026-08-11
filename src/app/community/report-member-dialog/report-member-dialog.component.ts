import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  REPORT_REASON_LABELS,
  ReportReason,
} from 'src/app/models/moderation.models';

/**
 * Data passed to the ReportMemberDialogComponent.
 */
export interface ReportMemberDialogData {
  username: string;
}

/**
 * The result the dialog closes with when the reporter submits.
 */
export interface ReportMemberDialogResult {
  reason: ReportReason;
  details?: string;
}

/**
 * Collects the category and the account of what happened before a report is
 * raised against a member.
 *
 * A block needs no explanation because only the blocker ever reads it; a report
 * is read by an administrator who was not there, so the details field is what
 * makes it actionable — hence the prompt rather than a bare confirmation.
 */
@Component({
  selector: 'app-report-member-dialog',
  templateUrl: './report-member-dialog.component.html',
  styleUrls: ['./report-member-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule],
})
export class ReportMemberDialogComponent {
  /** The data injected into the dialog. */
  public readonly data: ReportMemberDialogData = inject(MAT_DIALOG_DATA);

  private readonly _dialogRef =
    inject<MatDialogRef<ReportMemberDialogComponent, ReportMemberDialogResult>>(
      MatDialogRef,
    );
  private readonly _fb = inject(FormBuilder);

  reasons = Object.values(ReportReason);
  reasonLabels = REPORT_REASON_LABELS;

  form = this._fb.group({
    reason: [ReportReason.HARASSMENT, [Validators.required]],
    details: ['', [Validators.maxLength(1000)]],
  });

  /**
   * Whether the chosen category leaves the details doing the explaining.
   *
   * @returns True when the reporter picked "Something else".
   */
  get requiresDetails(): boolean {
    return this.form.controls.reason.value === ReportReason.OTHER;
  }

  /**
   * Submits the report, closing the dialog with the reporter's answers.
   *
   * "Something else" says nothing on its own, so details are required there
   * and optional for every other category.
   */
  onSubmit(): void {
    const details = this.form.controls.details.value?.trim() ?? '';

    if (this.requiresDetails && !details) {
      this.form.controls.details.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this._dialogRef.close({
      reason: this.form.controls.reason.value!,
      details: details || undefined,
    });
  }

  /**
   * Closes the dialog without reporting.
   */
  onCancel(): void {
    this._dialogRef.close();
  }
}
