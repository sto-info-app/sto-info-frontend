import {
  NOTIFICATION_SEVERITY_LABELS,
  NotificationSeverity,
  NotificationTarget,
} from './notification.models';

describe('notification.models', () => {
  it('should expose expected notification severity enum values', () => {
    expect(NotificationSeverity.INFO).toBe('INFO');
    expect(NotificationSeverity.SUCCESS).toBe('SUCCESS');
    expect(NotificationSeverity.WARNING).toBe('WARNING');
    expect(NotificationSeverity.CRITICAL).toBe('CRITICAL');
  });

  it('should expose expected notification target enum values', () => {
    expect(NotificationTarget.BROADCAST).toBe('BROADCAST');
    expect(NotificationTarget.USER).toBe('USER');
  });

  it('should map the severity labels', () => {
    expect(NOTIFICATION_SEVERITY_LABELS).toEqual({
      [NotificationSeverity.INFO]: 'Info',
      [NotificationSeverity.SUCCESS]: 'Success',
      [NotificationSeverity.WARNING]: 'Warning',
      [NotificationSeverity.CRITICAL]: 'Critical',
    });
  });
});
