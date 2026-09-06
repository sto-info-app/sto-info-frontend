import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { CustomTrackingReorderControlsComponent } from '../custom-tracking-reorder-controls/custom-tracking-reorder-controls.component';

/** Distinguishes one panel from another, for `aria-controls`. */
let nextGroupPanelId = 0;

/**
 * The heading bar of a section or a tab, and whatever sits under it.
 *
 * One component for both. A section and a tab are the same shape — a name, a
 * description, whether it is public, the controls that reorder it and the
 * things inside it — and two copies of that would be two chances for the
 * expanded state, the ARIA wiring or the button wording to drift apart.
 *
 * What is inside is projected rather than passed in, because a section holds
 * tabs and a tab holds fields, and neither this component nor its expanded
 * state cares which.
 */
@Component({
  selector: 'app-custom-tracking-group-panel',
  templateUrl: './custom-tracking-group-panel.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CustomTrackingReorderControlsComponent],
})
export class CustomTrackingGroupPanelComponent {
  /** What it is called. */
  @Input({ required: true }) name!: string;

  /** What kind of thing it is, in prose: "section" or "tab". */
  @Input({ required: true }) kind!: string;

  /** What the things inside it are called, in prose: "tab" or "field". */
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

  /** Whether it may still hold more. */
  @Input() canAddChild = true;

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

  /** Raised when something new should be created inside it. */
  @Output() readonly childAdded = new EventEmitter<void>();

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
