import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LcarsWarningMessageComponent } from '../lcars-warning-message/lcars-warning-message.component';

/**
 * Data passed to the ConfirmDialogComponent.
 */
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * A generic LCARS-styled confirmation dialog.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, LcarsWarningMessageComponent],
})
export class ConfirmDialogComponent {
  /** The data injected into the dialog. */
  public readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  /**
   * Closes the dialog with a true result.
   */
  onConfirm(): void {
    this._dialogRef.close(true);
  }

  /**
   * Closes the dialog with a false result.
   */
  onCancel(): void {
    this._dialogRef.close(false);
  }
}
