import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * The move-up and move-down buttons on one item of an orderable list.
 *
 * Drag-and-drop is never the only way to reorder anything here. These buttons
 * are what make an order reachable by keyboard and reliable on a touch screen,
 * and the drag handle beside them is an affordance for people who would rather
 * drag — not a replacement for them.
 *
 * Each button says what it moves, because "move up" on its own is ambiguous on
 * a page holding four orderable lists at once and a screen reader announces
 * the name rather than the row it sits in.
 */
@Component({
  selector: 'app-custom-tracking-reorder-controls',
  templateUrl: './custom-tracking-reorder-controls.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTrackingReorderControlsComponent {
  /** What the item is called, for the buttons to name. */
  @Input({ required: true }) itemName!: string;

  /** Where the item currently sits. */
  @Input({ required: true }) index!: number;

  /** How many items the list holds. */
  @Input({ required: true }) count!: number;

  /** Raised when the item should move one place earlier. */
  @Output() readonly moveUp = new EventEmitter<void>();

  /** Raised when the item should move one place later. */
  @Output() readonly moveDown = new EventEmitter<void>();

  /**
   * Whether the item is already first.
   *
   * @returns True when there is nowhere above it to go.
   */
  get isFirst(): boolean {
    return this.index <= 0;
  }

  /**
   * Whether the item is already last.
   *
   * @returns True when there is nowhere below it to go.
   */
  get isLast(): boolean {
    return this.index >= this.count - 1;
  }
}
