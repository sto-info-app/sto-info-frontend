import { nextTabIndex } from './roving-tabs.utility';

describe('nextTabIndex', () => {
  it('moves right and left along the row', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
  });

  // A row that refuses to go right from the last tab just feels broken, and
  // there is nothing past the end to arrive at instead.
  it('wraps at both ends', () => {
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
  });

  it('jumps to either end', () => {
    expect(nextTabIndex('Home', 2, 3)).toBe(0);
    expect(nextTabIndex('End', 0, 3)).toBe(2);
  });

  // Up and down mean nothing in a row, and swallowing them would stop the page
  // scrolling while the keyboard happened to be on a tab.
  it('leaves every other key alone', () => {
    expect(nextTabIndex('ArrowDown', 1, 3)).toBeNull();
    expect(nextTabIndex('Enter', 1, 3)).toBeNull();
  });
});
