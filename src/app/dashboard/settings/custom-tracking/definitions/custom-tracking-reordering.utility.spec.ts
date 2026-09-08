import { moveInList } from './custom-tracking-reordering.utility';

describe('moveInList', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('moves an item earlier', () => {
    expect(moveInList(items, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves an item later', () => {
    expect(moveInList(items, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  // The caller has not heard back from the server yet, so what it still holds
  // has to be the order the server last confirmed.
  it('leaves the list it was given alone', () => {
    moveInList(items, 0, 3);

    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  // This is what makes the move buttons at the ends of a list safe to press.
  it.each([
    ['off the top', 0, -1],
    ['off the bottom', 3, 4],
    ['from beyond the list', 9, 0],
    ['from before the list', -1, 0],
    ['to where it already is', 1, 1],
  ])('leaves the order unchanged when moving %s', (_situation, from, to) => {
    expect(moveInList(items, from, to)).toEqual(items);
  });
});
