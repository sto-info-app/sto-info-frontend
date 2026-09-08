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
 * These buttons are the only way an order changes, which is what makes it
 * reachable by keyboard and reliable on a touch screen.
 *
 * Each button says what it moves, because "move up" on its own is ambiguous on
 * a page holding four orderable lists at once and a screen reader announces
 * the name rather than the row it sits in.
 *
 * The arrows point the way the list itself runs: up and down for a stack of
 * panels, left and right for a strip of tabs. An arrow pointing up beside a
 * row of tabs would be asking the reader to translate it.
 *
 * They are circled carets rather than bare ones, which is what tells them
 * apart at a glance from the bare caret that folds a panel away — the site
 * uses one shape for reordering and the other for expanding, everywhere.
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

  /** Which way the list runs, and so which way the arrows point. */
  @Input() axis: 'vertical' | 'horizontal' = 'vertical';

  /** Raised when the item should move one place earlier. */
  @Output() readonly moveUp = new EventEmitter<void>();

  /** Raised when the item should move one place later. */
  @Output() readonly moveDown = new EventEmitter<void>();

  /**
   * Whether the list runs across the page rather than down it.
   *
   * @returns True when the arrows should point left and right.
   */
  get isHorizontal(): boolean {
    return this.axis === 'horizontal';
  }

  /**
   * What moving the item one place earlier is called.
   *
   * @returns The label for the first button.
   */
  get earlierLabel(): string {
    return `Move ${this.itemName} ${this.isHorizontal ? 'left' : 'up'}`;
  }

  /**
   * What moving the item one place later is called.
   *
   * @returns The label for the second button.
   */
  get laterLabel(): string {
    return `Move ${this.itemName} ${this.isHorizontal ? 'right' : 'down'}`;
  }

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
