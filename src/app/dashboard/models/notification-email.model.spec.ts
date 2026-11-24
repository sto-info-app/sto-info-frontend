import {
  NOTIFICATION_EMAIL_OPTIONS,
  notificationEmailGroupOf,
} from './notification-email.model';

describe('notification email options (sc-1067)', () => {
  it('lists every switch under its heading, in the order Settings shows them', () => {
    const byGroup = (group: string): string[] =>
      NOTIFICATION_EMAIL_OPTIONS.filter(option => option.group === group).map(
        option => option.type,
      );

    expect(NOTIFICATION_EMAIL_OPTIONS).toHaveLength(26);
    expect(NOTIFICATION_EMAIL_OPTIONS[0]).toEqual({
      type: 'LOGIN',
      group: 'ACCOUNT',
      label: 'Login alerts',
    });
    expect(byGroup('ACCOUNT')).toEqual(['LOGIN']);
    expect(byGroup('STORYTIME')).toHaveLength(10);
    expect(byGroup('FRIENDS')).toEqual(['FRIEND_REQUEST', 'FRIEND_ACCEPTED']);
    expect(byGroup('FLEET')).toHaveLength(13);
    expect(NOTIFICATION_EMAIL_OPTIONS.at(-1)).toEqual({
      type: 'FLEET_TRANSCRIPT',
      group: 'FLEET',
      label: 'Chat transcripts ready',
    });
  });

  it('puts a type under the heading its name begins with', () => {
    expect(notificationEmailGroupOf('STORYTIME_REPLY')).toBe('STORYTIME');
    expect(notificationEmailGroupOf('FRIEND_ACCEPTED')).toBe('FRIENDS');
    expect(notificationEmailGroupOf('FLEET_ARMADA')).toBe('FLEET');
    expect(notificationEmailGroupOf('LOGIN')).toBe('ACCOUNT');
  });
});
