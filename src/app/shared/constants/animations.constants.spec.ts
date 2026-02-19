import { PROGRESS_BAR_SUBMITTING_CLASS } from './animations.constants';

describe('animations.constants', () => {
  it('should export submitting class name', () => {
    expect(PROGRESS_BAR_SUBMITTING_CLASS).toBe('submitting');
  });
});
