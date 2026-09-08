import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { CustomTrackingInfoBarComponent } from '../../custom-tracking-info-bar/custom-tracking-info-bar.component';
import { CustomTrackingSectionBarComponent } from '../../custom-tracking-section-bar/custom-tracking-section-bar.component';
import { CustomTrackingReorderControlsComponent } from '../custom-tracking-reorder-controls/custom-tracking-reorder-controls.component';

/** Distinguishes one panel from another, for `aria-controls`. */
let nextGroupPanelId = 0;

/**
 * One section of the builder: an LCARS heading bar, and everything under it.
 *
 * The bar is the shared one, so a section here folds away with the same caret
 * as a section of a help guide or a Storytime page. It carries the name and
 * that caret and nothing else: what the section is — who may see it, how many
 * tabs are inside — and the arrows, pen and bin that arrange it are stated on
 * an info panel just inside it, the way a tab states the same things. Arrows
 * that reorder a section sitting beside a caret that folds it away were two
 * carets an inch apart doing unrelated things.
 *
 * What is inside is projected rather than passed in — the strip of tabs, the
 * fields of whichever tab is at the front, and the forms that change any of
 * them. Neither this component nor its expanded state cares what that content
 * turns out to be, which is what keeps the arranging of a section separate
 * from the arranging of what is in it.
 */
@Component({
  selector: 'app-custom-tracking-group-panel',
  templateUrl: './custom-tracking-group-panel.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CustomTrackingSectionBarComponent,
    CustomTrackingInfoBarComponent,
    CustomTrackingReorderControlsComponent,
  ],
})
export class CustomTrackingGroupPanelComponent {
  /** What it is called. */
  @Input({ required: true }) name!: string;

  /** What the things inside it are called, in prose: "tab". */
  @Input({ required: true }) childKind!: string;

  /** Where it sits among its siblings. */
  @Input({ required: true }) index!: number;

  /** How many siblings it has, itself included. */
  @Input({ required: true }) count!: number;

  /** What it is for, or null. */
  @Input() description: string | null = null;

  /** Whether its owner has asked for it to be public. */
  @Input() publiclyVisible = false;

  /** Whether a moderator has hidden it. */
  @Input() suppressed = false;

  /** How many things are inside it. */
  @Input() childCount = 0;

  /** Whether what is inside is showing. */
  @Input() isExpanded = false;

  /** Whether a change is in flight anywhere in the builder. */
  @Input() isSaving = false;

  /** Raised when the panel should open or close. */
  @Output() readonly toggled = new EventEmitter<void>();

  /** Raised when it should move one place earlier. */
  @Output() readonly moveUp = new EventEmitter<void>();

  /** Raised when it should move one place later. */
  @Output() readonly moveDown = new EventEmitter<void>();

  /** Raised when its own settings should be opened. */
  @Output() readonly edited = new EventEmitter<void>();

  /** Raised when it should be deleted. */
  @Output() readonly removed = new EventEmitter<void>();

  /** Identifies what this panel controls, for the button that opens it. */
  readonly contentId = `custom-tracking-group-panel-${nextGroupPanelId++}`;

  /**
   * How many things are inside, in words.
   *
   * @returns A count and the right noun for it.
   */
  get childSummary(): string {
    return this.childCount === 1
      ? `1 ${this.childKind}`
      : `${this.childCount} ${this.childKind}s`;
  }
}
