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
