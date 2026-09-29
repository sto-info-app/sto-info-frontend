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

/** What the reason dialog is opened with. */
export interface GovernanceReasonDialogData {
  readonly title: string;
  /** What is about to happen, as text. */
  readonly message: string;
  /** What the box asks for: "Reason" or "Purpose". */
  readonly label: string;
  readonly confirmText: string;
  /** The fewest characters, trimmed; one by default. */
  readonly min?: number;
  readonly max: number;
}

/**
 * Asks a site administrator why, before a suspension, a reinstatement or a
 * look into a Fleet (FC-036). Closes with the reason, trimmed, or undefined
 * when cancelled.
 */
@Component({
  selector: 'app-governance-reason-dialog',
  templateUrl: './governance-reason-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovernanceReasonDialogComponent {
  readonly data: GovernanceReasonDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<GovernanceReasonDialogComponent, string>,
  );

  readonly reason = signal('');

  /** Whether enough has been said. */
  readonly isValid = computed(
    () => this.reason().trim().length >= (this.data.min ?? 1),
  );

  /** Closes with the reason. */
  protected confirm(): void {
    if (this.isValid()) {
      this._dialogRef.close(this.reason().trim());
    }
  }

  /** Closes without doing anything. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
