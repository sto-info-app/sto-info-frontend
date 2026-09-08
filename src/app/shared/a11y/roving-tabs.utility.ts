/**
 * Where an arrow key moves within a horizontal row of tabs.
 *
 * A row of tabs is one stop in the tab order rather than one stop per tab: the
 * arrows move between them and focus follows, which is what anything
 * announcing itself as a tab list is expected to do. Left and right only,
 * because the row is a row.
 *
 * Movement wraps. A row that refuses to go right from the last tab just feels
 * broken, and there is nothing past the end to arrive at instead.
 *
 * @param key - The key that was pressed.
 * @param current - Which tab is selected now.
 * @param count - How many tabs there are.
 * @returns The tab to move to, or null when the key means nothing here.
 */
export function nextTabIndex(
  key: string,
  current: number,
  count: number,
): number | null {
  const moves: Record<string, number> = {
    ArrowRight: current + 1,
    ArrowLeft: current - 1,
    Home: 0,
    End: count - 1,
  };
  const requested = moves[key];

  return requested === undefined ? null : (requested + count) % count;
}
