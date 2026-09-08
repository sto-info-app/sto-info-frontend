/**
 * Matches the block anchors the server stamps on rendered Storytime content.
 *
 * Anything else in the body — an anchor a heading picked up, an id inside an
 * embed — is not a position the server will accept, so it is ignored here
 * rather than sent and rejected.
 */
const BLOCK_ANCHOR_PATTERN = /^b\d{1,6}$/;

/**
 * Where a reader has got to in a Chapter.
 */
export interface ReadingPosition {
  /** How far through the Chapter they have read, from 0 to 100. */
  progressPercent: number;
  /** The block anchor to resume at, or null when there is nothing to record. */
  blockId: string | null;
}

/**
 * Works out where a reader has got to in a rendered Chapter.
 *
 * Progress is measured by how much of the body has passed the bottom of the
 * viewport, so a reader who can see the end of the Chapter has read it — rather
 * than being left short by the navigation and footer below it.
 *
 * The resume point is the block currently under the top of the viewport, which
 * is what a reader would say they were "at". It is stored as an anchor rather
 * than an offset because anchors survive a re-render, a change of screen size
 * and a change of font — none of which a pixel offset does.
 *
 * @param container - The element holding the rendered body.
 * @param viewportHeight - The height of the viewport.
 * @returns The reader's position.
 */
export function resolveReadingPosition(
  container: HTMLElement,
  viewportHeight: number,
): ReadingPosition {
  const bounds = container.getBoundingClientRect();

  return {
    progressPercent: resolvePercent(bounds, container, viewportHeight),
    blockId: resolveBlockId(container),
  };
}

/**
 * Works out how far through the body the reader has scrolled.
 *
 * @param bounds - The body's position relative to the viewport.
 * @param container - The element holding the rendered body.
 * @param viewportHeight - The height of the viewport.
 * @returns The percentage read, from 0 to 100.
 */
function resolvePercent(
  bounds: DOMRect,
  container: HTMLElement,
  viewportHeight: number,
): number {
  const height = container.offsetHeight || bounds.height;

  // A body with no height cannot be partly read. Treating it as unread rather
  // than dividing by zero keeps a Chapter that has not laid out yet from
  // reporting a position at all.
  if (height <= 0) {
    return 0;
  }

  const readToPixel = viewportHeight - bounds.top;

  return clampPercent(Math.round((readToPixel / height) * 100));
}

/**
 * Finds the block the reader is currently at.
 *
 * @param container - The element holding the rendered body.
 * @returns The block anchor, or null when the body has none.
 */
function resolveBlockId(container: HTMLElement): string | null {
  const blocks = Array.from(container.querySelectorAll('[id]')).filter(
    element => BLOCK_ANCHOR_PATTERN.test(element.id),
  );

  if (blocks.length === 0) {
    return null;
  }

  // The last block whose top has passed the top of the viewport is the one the
  // reader is looking at. Before any has, they are still at the first.
  const current = blocks.reduce<Element | null>(
    (found, block) => (block.getBoundingClientRect().top <= 0 ? block : found),
    null,
  );

  return (current ?? blocks[0]).id;
}

/**
 * Holds a percentage to the range the server will accept.
 *
 * @param percent - The calculated percentage.
 * @returns The percentage, between 0 and 100.
 */
function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}
