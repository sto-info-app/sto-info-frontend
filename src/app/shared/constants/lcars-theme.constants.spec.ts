import type { AlertState } from './lcars-theme.constants';

describe('lcars-theme.constants', () => {
  it('should allow AlertState to be red, yellow, green, blue, or grey', () => {
    const validStates: AlertState[] = [
      'red',
      'yellow',
      'green',
      'blue',
      'grey',
    ];
    expect(validStates).toHaveLength(5);
    expect(validStates).toContain('red');
    expect(validStates).toContain('grey');
  });
});
