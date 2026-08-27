import { resolveReadingPosition } from './reading-position.utility';

describe('resolveReadingPosition', () => {
  const viewportHeight = 800;

  /**
   * Builds a body of blocks whose geometry the test controls.
   *
   * jsdom lays nothing out, so every measurement the calculation depends on is
   * stubbed here rather than left at the zeroes jsdom would report.
   *
   * @param options - The geometry to report.
   * @returns The container element.
   */
  const buildBody = (options: {
    top: number;
    height: number;
    blockTops?: number[];
    blockIds?: string[];
  }): HTMLElement => {
    const container = document.createElement('div');
    const { top, height, blockTops = [], blockIds } = options;

    blockTops.forEach((blockTop, index) => {
      const block = document.createElement('p');
      block.id = blockIds ? blockIds[index] : `b${index + 1}`;
      block.getBoundingClientRect = () => ({ top: blockTop }) as DOMRect;
      container.appendChild(block);
    });

    container.getBoundingClientRect = () => ({ top, height }) as DOMRect;
    Object.defineProperty(container, 'offsetHeight', { value: height });

    return container;
  };

  describe('how far through', () => {
    it('reports nothing read at the top of a long Chapter', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 800, height: 4000 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(0);
    });

    it('reports the proportion scrolled past', () => {
      const position = resolveReadingPosition(
        buildBody({ top: -1200, height: 4000 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(50);
    });

    // Measuring to the bottom of the viewport rather than its top means a
    // reader who can see the end of the Chapter has read it, instead of being
    // left short by the navigation and footer below.
    it('reports a Chapter fully read once its end is in view', () => {
      const position = resolveReadingPosition(
        buildBody({ top: -3200, height: 4000 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(100);
    });

    it('reports a Chapter shorter than the viewport as read', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 100, height: 300 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(100);
    });

    // Scrolling below the Chapter must not report more than all of it, and
    // scrolling above it must not report less than none.
    it('never reports beyond the whole Chapter', () => {
      const position = resolveReadingPosition(
        buildBody({ top: -9000, height: 4000 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(100);
    });

    it('never reports a negative amount', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 5000, height: 4000 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(0);
    });

    // A Chapter that has not laid out yet must report no position at all
    // rather than dividing by zero.
    it('reports nothing for a body with no height', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 0, height: 0 }),
        viewportHeight,
      );

      expect(position.progressPercent).toBe(0);
    });
  });

  describe('where to resume', () => {
    it('picks the block under the top of the viewport', () => {
      const position = resolveReadingPosition(
        buildBody({
          top: -1000,
          height: 4000,
          blockTops: [-900, -400, -50, 300, 700],
        }),
        viewportHeight,
      );

      expect(position.blockId).toBe('b3');
    });

    it('picks the first block before the reader has scrolled', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 100, height: 4000, blockTops: [200, 600, 1000] }),
        viewportHeight,
      );

      expect(position.blockId).toBe('b1');
    });

    it('picks the last block at the end of the Chapter', () => {
      const position = resolveReadingPosition(
        buildBody({
          top: -3600,
          height: 4000,
          blockTops: [-3500, -2000, -400],
        }),
        viewportHeight,
      );

      expect(position.blockId).toBe('b3');
    });

    it('reports no block for a body with none', () => {
      const position = resolveReadingPosition(
        buildBody({ top: 0, height: 4000 }),
        viewportHeight,
      );

      expect(position.blockId).toBeNull();
    });

    // Ids the renderer did not stamp are not positions the server will accept,
    // so sending one would only earn a rejection.
    it('ignores ids that are not block anchors', () => {
      const position = resolveReadingPosition(
        buildBody({
          top: -1000,
          height: 4000,
          blockTops: [-900, -400],
          blockIds: ['b1', 'some-heading'],
        }),
        viewportHeight,
      );

      expect(position.blockId).toBe('b1');
    });

    it('reports no block when none of the ids are anchors', () => {
      const position = resolveReadingPosition(
        buildBody({
          top: -1000,
          height: 4000,
          blockTops: [-900],
          blockIds: ['some-heading'],
        }),
        viewportHeight,
      );

      expect(position.blockId).toBeNull();
    });
  });
});
