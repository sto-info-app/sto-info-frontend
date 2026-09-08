import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import {
  StorytimeReportReason,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { REPORT_REASONS } from '../../storytime.constants';

/** What the dialog is being opened about. */
export interface ReportContentDialogData {
  targetType: StorytimeTargetType;
  targetId: string;
  /** What the reader is looking at, so the dialog can name it back to them. */
  label: string;
}

/** What the dialog closes with when the reader submits. */
export interface ReportContentDialogResult {
  reasonCode: StorytimeReportReason;
  description?: string;
}

/**
 * Collects a category and an explanation before a report is raised.
 *
 * The categories are the content policy's own, so a reporter is choosing from
 * the same list an administrator will cite back to the creator. The
 * explanation is optional: somebody who has just read something upsetting
 * should not have to write an essay to say so.
 */
@Component({
  selector: 'app-report-content-dialog',
  templateUrl: './report-content-dialog.component.html',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule, RouterModule],
})
export class ReportContentDialogComponent {
  /** What is being reported. */
  readonly data: ReportContentDialogData = inject(MAT_DIALOG_DATA);

  /** The categories a reporter may pick from. */
  readonly reasons = REPORT_REASONS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _dialogRef =
    inject<
      MatDialogRef<ReportContentDialogComponent, ReportContentDialogResult>
    >(MatDialogRef);
  private readonly _formBuilder = inject(FormBuilder);

  /** The report form. */
  readonly form = this._formBuilder.nonNullable.group({
    reasonCode: ['HARASSMENT', Validators.required],
    description: ['', Validators.maxLength(2000)],
  });

  /**
   * Sends the report back to whoever opened the dialog.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this._dialogRef.close({
      reasonCode: value.reasonCode as StorytimeReportReason,
      description: value.description.trim() || undefined,
    });
  }

  /**
   * Closes without reporting anything.
   */
  cancel(): void {
    this._dialogRef.close();
  }
}
