import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  CustomTrackingEmptyMode,
  CustomTrackingField,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingReorderControlsComponent } from '../custom-tracking-reorder-controls/custom-tracking-reorder-controls.component';

/**
 * One field, as the builder lists it: a panel of its own.
 *
 * A summary rather than a form. Its name and the controls that arrange it run
 * along the top, and what it actually asks — whether an answer is compulsory,
 * who may read it, what it offers to choose from and what it shows where
 * nothing has been recorded — is stated beneath as the labelled values the
 * rest of the site states facts with. The form that changes any of it opens
 * below the panel, so a tab holding twenty fields stays readable.
 *
 * Everything it reports is a word rather than a colour. A row of coloured
 * badges could say a field was public but never what "public" meant for a
 * field nobody had filled in; a reader who cannot tell one badge from another
 * reads exactly the same facts here.
 */
@Component({
  selector: 'app-custom-tracking-field-panel',
  templateUrl: './custom-tracking-field-panel.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CustomTrackingReorderControlsComponent],
})
export class CustomTrackingFieldPanelComponent {
  /** The field being listed. */
  @Input({ required: true }) field!: CustomTrackingField;

  /** What its type is called, as the server named it. */
  @Input({ required: true }) typeLabel!: string;

  /** Where it sits among its siblings. */
  @Input({ required: true }) index!: number;

  /** How many siblings it has, itself included. */
  @Input({ required: true }) count!: number;

  /** Whether the type draws its answers from a list of options. */
  @Input() usesOptions = false;

  /** Whether a change is in flight anywhere in the builder. */
  @Input() isSaving = false;

  /** Raised when it should move one place earlier. */
  @Output() readonly moveUp = new EventEmitter<void>();

  /** Raised when it should move one place later. */
  @Output() readonly moveDown = new EventEmitter<void>();

  /** Raised when its settings should be opened. */
  @Output() readonly edited = new EventEmitter<void>();

  /** Raised when it should be deleted. */
  @Output() readonly removed = new EventEmitter<void>();

  /**
   * How many answers the field offers, for the types that offer any.
   *
   * Withdrawn options are left out. They cannot be chosen, so counting them
   * would overstate what the field asks of anybody filling it in.
   *
   * @returns The number of options still on offer.
   */
  get liveOptionCount(): number {
    return this.field.options.filter(option => !option.withdrawn).length;
  }

  /**
   * Whether the field offers nothing to choose from but should.
   *
   * @returns True when a choice field has no live options.
   */
  get needsOptions(): boolean {
    return this.usesOptions && this.liveOptionCount === 0;
  }

  /**
   * What the field shows its owner where it has no value.
   *
   * @returns A short phrase for the badge.
   */
  get emptySummary(): string {
    return this.describeEmptyMode(this.field.ownerEmptyMode);
  }

  /**
   * What the field shows the public where it has no value.
   *
   * @returns A short phrase for the badge.
   */
  get publicEmptySummary(): string {
    return this.describeEmptyMode(this.field.publicEmptyMode);
  }

  /**
   * Puts one empty mode into words.
   *
   * @param mode - The mode.
   * @returns A short phrase.
   */
  private describeEmptyMode(mode: CustomTrackingEmptyMode): string {
    if (mode === CustomTrackingEmptyMode.HIDE) {
      return 'hidden';
    }

    return mode === CustomTrackingEmptyMode.SHOW_LABEL
      ? 'name only'
      : 'placeholder';
  }
}
