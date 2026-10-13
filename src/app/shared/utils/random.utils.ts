/** How many values one draw of 32 random bits can take. */
const UINT32_RANGE = 2 ** 32;

/**
 * Picks a whole number at random from 0 up to, but not including, the bound.
 *
 * Drawn from the browser's cryptographic generator rather than `Math.random`,
 * so nothing that comes to depend on it later is left predictable. A draw
 * that falls in the short top slice of the 32-bit range is thrown away and
 * drawn again, so every answer is equally likely rather than the low ones
 * slightly favoured.
 *
 * @param maxExclusive - The bound: a whole number from 1 to 2^32.
 * @returns The number picked.
 * @throws RangeError when the bound is not a whole number in that range.
 */
export function randomInt(maxExclusive: number): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(
      `A random bound must be a whole number from 1 to 2^32, not ${maxExclusive}.`,
    );
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const draw = new Uint32Array(1);

  do {
    globalThis.crypto.getRandomValues(draw);
  } while (draw[0] >= limit);

  return draw[0] % maxExclusive;
}

/**
 * A copy of a list in a random order (a Fisher–Yates shuffle), every order
 * being equally likely.
 *
 * @param items - The list, which is left as it was.
 * @returns The shuffled copy.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
