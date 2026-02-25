import {
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
  API_HEALTH_STATE_DOWN,
  DEFAULT_API_HEALTH_STATE,
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
});
