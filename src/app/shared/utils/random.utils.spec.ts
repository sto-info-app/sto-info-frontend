import { randomInt, shuffled } from './random.utils';

describe('random utils', () => {
  /**
   * Makes the cryptographic generator hand out the given 32-bit values, one
   * to each draw, in order.
   *
   * @param values - The values to hand out.
   * @returns The spy.
   */
  const drawing = (...values: number[]) =>
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        (array as unknown as Uint32Array)[0] = values.shift() ?? 0;
        return array;
      });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('randomInt', () => {
    it('stays within the bound', () => {
      for (let i = 0; i < 50; i++) {
        const value = randomInt(6);

        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(6);
      }
    });

    it('draws from the cryptographic generator', () => {
      const spy = drawing(13);

      expect(randomInt(10)).toBe(3);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    // 2^32 is not a multiple of 3, so the last value it can draw would make
    // 0 a little more likely than 1 or 2 if it were kept.
    it('draws again rather than favour the low answers', () => {
      const spy = drawing(2 ** 32 - 1, 7);

      expect(randomInt(3)).toBe(1);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('allows the whole 32-bit range as a bound', () => {
      drawing(2 ** 32 - 1);

      expect(randomInt(2 ** 32)).toBe(2 ** 32 - 1);
    });

    it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])(
      'refuses a bound of %p',
      bound => {
        expect(() => randomInt(bound)).toThrow(RangeError);
      },
    );
  });

  describe('shuffled', () => {
    it('keeps every item and leaves the list it was given alone', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];

      const result = shuffled(items);

      expect([...result].sort()).toEqual(items);
      expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    // Each step swaps the last unsettled item with one picked from it and
    // those before it: here the first, then the second, then the first again.
    it('swaps each item with one picked at random from those still unsettled', () => {
      drawing(0, 1, 0);

      expect(shuffled([1, 2, 3, 4])).toEqual([3, 4, 2, 1]);
    });

    it('returns an empty or single-item list as it was', () => {
      const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');

      expect(shuffled([])).toEqual([]);
      expect(shuffled(['only'])).toEqual(['only']);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
