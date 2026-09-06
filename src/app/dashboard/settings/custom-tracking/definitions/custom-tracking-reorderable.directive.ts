import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';

import { CustomTrackingDragState } from './custom-tracking-reordering.utility';

/** Where a dragged item started, and where it was dropped. */
export interface CustomTrackingReorderRequest {
  from: number;
  to: number;
}

/**
 * Makes one row of an orderable list draggable onto its siblings.
 *
 * One directive rather than the same four handlers on every list. The builder
 * has sections, the tabs inside one, the fields inside one of those and a
 * field's options all orderable on the same page, and four copies of this
 * would be four chances to get the cross-list check wrong.
 *
 * A drop is only ever accepted inside the list the drag started in. A tab has
 * no meaning inside a different section, and the server would refuse the order
 * anyway; refusing before the drop is what stops the row appearing to move and
 * then springing back.
 *
 * Nothing here is the only way to reorder anything. Every list also carries
 * move-up and move-down buttons, which are what make an order reachable by
 * keyboard and reliable on a touch screen.
 */
@Directive({
  selector: '[appCustomTrackingReorderable]',
  standalone: true,
})
export class CustomTrackingReorderableDirective {
  /** Which list the row belongs to. */
  @Input({ required: true }) reorderList!: string;

  /** Where the row currently sits in that list. */
  @Input({ required: true }) reorderIndex!: number;

  /** Raised when a row has been dropped somewhere new. */
  @Output()
  readonly reordered = new EventEmitter<CustomTrackingReorderRequest>();

  private readonly _drag = inject(CustomTrackingDragState);

  /** Rows are draggable; the handle beside them says so. */
  @HostBinding('attr.draggable') readonly draggable = 'true';

  /**
   * Whether this row is the one under the pointer.
   *
   * @returns True while it is being dragged.
   */
  @HostBinding('class.custom-tracking-dragging')
  get isDragging(): boolean {
    return this._drag.isDragging(this.reorderList, this.reorderIndex);
  }

  /**
   * Records where a drag started.
   *
   * @param event - The drag event.
   */
  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    this._drag.start(this.reorderList, this.reorderIndex);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox starts no drag at all unless something is carried, even where
      // nothing reads it back.
      event.dataTransfer.setData('text/plain', String(this.reorderIndex));
    }
  }

  /**
   * Allows a drop, but only from the same list.
   *
   * @param event - The drag event.
   */
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    if (!this._drag.accepts(this.reorderList)) {
      return;
    }

    // Preventing the default is what marks this a valid drop target; without
    // it the browser refuses the drop and the row springs back.
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  /**
   * Completes a drop.
   *
   * @param event - The drag event.
   */
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    const from = this._drag.drop(this.reorderList);

    if (from === null) {
      return;
    }

    event.preventDefault();

    if (from !== this.reorderIndex) {
      this.reordered.emit({ from, to: this.reorderIndex });
    }
  }

  /** Forgets a drag that ended anywhere else. */
  @HostListener('dragend')
  onDragEnd(): void {
    this._drag.end();
  }
}
