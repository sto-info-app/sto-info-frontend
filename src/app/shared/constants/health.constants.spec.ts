import {
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
  API_HEALTH_STATE_DOWN,
  DEFAULT_API_HEALTH_STATE,
  API_HEALTH_FAILURES_BEFORE_WARNING,
  API_HEALTH_FAILURES_BEFORE_DOWN,
  NO_API_HEALTH_FAILURES,
} from './health.constants';

describe('health.constants', () => {
  it('should export API_HEALTH_STATE_UNKNOWN', () => {
    expect(API_HEALTH_STATE_UNKNOWN).toBe('UNKNOWN');
  });

  it('should export API_HEALTH_STATE_UP', () => {
    expect(API_HEALTH_STATE_UP).toBe('UP');
  });

  it('should export API_HEALTH_STATE_DOWN', () => {
    expect(API_HEALTH_STATE_DOWN).toBe('DOWN');
  });

  it('should set DEFAULT_API_HEALTH_STATE to UNKNOWN', () => {
    expect(DEFAULT_API_HEALTH_STATE).toBe(API_HEALTH_STATE_UNKNOWN);
  });

  it('should warn after four consecutive failures', () => {
    expect(API_HEALTH_FAILURES_BEFORE_WARNING).toBe(4);
  });

  it('should declare the API down after thirty-one consecutive failures', () => {
    expect(API_HEALTH_FAILURES_BEFORE_DOWN).toBe(31);
  });

  it('should leave room for silent failures below the warning threshold', () => {
    expect(NO_API_HEALTH_FAILURES).toBe(0);
    expect(API_HEALTH_FAILURES_BEFORE_WARNING).toBeLessThan(
      API_HEALTH_FAILURES_BEFORE_DOWN,
    );
  });
});
