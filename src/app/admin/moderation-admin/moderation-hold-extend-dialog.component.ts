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

/** What the extend dialog is opened with. */
export interface ModerationHoldExtendDialogData {
  /** Whose evidence, or which report's. */
  readonly subject: string;
  /** Its review date now, as ISO 8601. */
  readonly reviewAt: string;
}

/** What the extend dialog closes with. */
export interface ModerationHoldExtendDialogResult {
  /** The new review date, as ISO 8601 at the end of that day, UTC. */
  readonly reviewAt: string;
  readonly reason: string;
}

/** How far ahead a review may be set, in days. */
export const HOLD_REVIEW_DAYS = 180;

/** One day, in milliseconds. */
const DAY = 86_400_000;

/**
 * An ISO day, as a date field holds it.
 *
 * @param at - The instant.
 * @returns `YYYY-MM-DD`, in UTC.
 */
const dayOf = (at: Date): string => at.toISOString().slice(0, 10);

/**
 * Moves a hold's review date, with a reason (FC-036): at most 180 days
 * ahead, as a hold is never kept without review. Closes with the date and
 * reason, or undefined when cancelled.
 */
@Component({
  selector: 'app-moderation-hold-extend-dialog',
  templateUrl: './moderation-hold-extend-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationHoldExtendDialogComponent {
  readonly data: ModerationHoldExtendDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<
      ModerationHoldExtendDialogComponent,
      ModerationHoldExtendDialogResult
    >,
  );

  private readonly _now = Date.now();

  readonly reviewDays = HOLD_REVIEW_DAYS;
  readonly earliest = dayOf(new Date(this._now + DAY));
  readonly latest = dayOf(new Date(this._now + (HOLD_REVIEW_DAYS - 1) * DAY));
  readonly day = signal(this.latest);
  readonly reason = signal('');

  /** Whether the date is within reach and a reason is given. */
  readonly isValid = computed(() => {
    const day = this.day();

    return (
      day >= this.earliest &&
      day <= this.latest &&
      this.reason().trim().length > 0
    );
  });

  /** Closes with the new date and the reason. */
  protected confirm(): void {
    if (this.isValid()) {
      this._dialogRef.close({
        reviewAt: `${this.day()}T23:59:59.000Z`,
        reason: this.reason().trim(),
      });
    }
  }

  /** Closes without changing anything. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
