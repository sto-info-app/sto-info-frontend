import {
  CustomTrackingDragState,
  moveInList,
} from './custom-tracking-reordering.utility';

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

describe('CustomTrackingDragState', () => {
  let state: CustomTrackingDragState;

  beforeEach(() => {
    state = new CustomTrackingDragState();
  });

  it('holds nothing until a drag starts', () => {
    expect(state.listId).toBeNull();
    expect(state.index).toBeNull();
    expect(state.accepts('sections')).toBe(false);
  });

  it('remembers where a drag started', () => {
    state.start('sections', 2);

    expect(state.isDragging('sections', 2)).toBe(true);
    expect(state.isDragging('sections', 1)).toBe(false);
  });

  // A tab has no meaning inside a different section, and the server would
  // refuse the order anyway, so the refusal happens before the drop.
  it('refuses a drop into a different list', () => {
    state.start('tabs-of-section-1', 0);

    expect(state.accepts('tabs-of-section-2')).toBe(false);
    expect(state.isDragging('tabs-of-section-2', 0)).toBe(false);
    expect(state.drop('tabs-of-section-2')).toBeNull();
  });

  it('reports where a drop came from', () => {
    state.start('fields', 3);

    expect(state.drop('fields')).toBe(3);
  });

  it('forgets the drag once it has been dropped', () => {
    state.start('fields', 3);
    state.drop('fields');

    expect(state.listId).toBeNull();
    expect(state.index).toBeNull();
  });

  it('forgets a drag that ended without a drop', () => {
    state.start('options', 1);
    state.end();

    expect(state.accepts('options')).toBe(false);
  });
});
