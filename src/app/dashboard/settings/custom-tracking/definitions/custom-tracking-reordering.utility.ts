import { Injectable } from '@angular/core';

/**
 * Moves one item of a list to another position.
 *
 * Returns a new list rather than rearranging the one it was given, so a caller
 * that has not yet heard back from the server still has the order the server
 * last confirmed.
 *
 * A move to nowhere — off either end, or to where the item already is —
 * returns the order unchanged, which is what makes the move buttons at the
 * ends of a list safe to press.
 *
 * @param items - The list as it stands.
 * @param from - The position moving.
 * @param to - Where it is moving to.
 * @returns The list in its new order.
 */
export function moveInList<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const reordered = [...items];

  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return reordered;
  }

  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  return reordered;
}

/**
 * Which item is being dragged, and out of which list.
 *
 * The builder has four orderable lists on screen at once — sections, the tabs
 * inside one, the fields inside one of those, and a field's options — and
 * nothing may be dragged from one into another: a tab has no meaning inside a
 * different section, and the server would refuse the order anyway. Holding the
 * list a drag started in is what makes that refusal happen before the drop
 * rather than after it.
 *
 * Drag-and-drop is never the only way to reorder. Every list also has move-up
 * and move-down buttons, which are what make reordering possible by keyboard
 * and reliable on a touch screen.
 *
 * One instance for the whole application, because a pointer can only drag one
 * thing at a time and a second instance would be a second answer to the
 * question of what is being dragged.
 */
@Injectable({ providedIn: 'root' })
export class CustomTrackingDragState {
  /** The list a drag started in, or null when nothing is being dragged. */
  listId: string | null = null;

  /** The position a drag started from, or null. */
  index: number | null = null;

  /**
   * Records the start of a drag.
   *
   * @param listId - The list the item belongs to.
   * @param index - Its position in that list.
   */
  start(listId: string, index: number): void {
    this.listId = listId;
    this.index = index;
  }

  /**
   * Whether a drop into one list would be accepted.
   *
   * @param listId - The list being dragged over.
   * @returns True when the drag started in that same list.
   */
  accepts(listId: string): boolean {
    return this.listId === listId;
  }

  /**
   * Whether one item is the one being dragged.
   *
   * @param listId - The list the item belongs to.
   * @param index - Its position in that list.
   * @returns True when it is the item under the pointer.
   */
  isDragging(listId: string, index: number): boolean {
    return this.listId === listId && this.index === index;
  }

  /**
   * Completes a drop and reports where it came from.
   *
   * @param listId - The list being dropped into.
   * @returns The position the drag started from, or null when the drop is not
   *   one this state can complete.
   */
  drop(listId: string): number | null {
    const from = this.accepts(listId) ? this.index : null;

    this.end();

    return from;
  }

  /** Forgets the drag in progress, whether or not it ended in a drop. */
  end(): void {
    this.listId = null;
    this.index = null;
  }
}
