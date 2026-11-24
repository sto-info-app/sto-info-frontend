/**
 * Each kind of email somebody can opt in to (sc-1067), as the API names it.
 *
 * Every type but `LOGIN` starts off. The backend's list and this one are kept
 * in the same order, and each side's spec pins the labels below.
 */
export type NotificationEmailType =
  | 'LOGIN'
  | 'STORYTIME_STORY_INVITE'
  | 'STORYTIME_ARC_INVITE'
  | 'STORYTIME_MODERATION'
  | 'STORYTIME_APPEAL'
  | 'STORYTIME_SPOTLIGHT'
  | 'STORYTIME_FOLLOWER'
  | 'STORYTIME_COMMENT'
  | 'STORYTIME_REPLY'
  | 'STORYTIME_REACTION'
  | 'STORYTIME_FOLLOWED_PUBLICATION'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'FLEET_MENTION'
  | 'FLEET_REPLY'
  | 'FLEET_DIRECT_MESSAGE'
  | 'FLEET_ROSTER_PROPOSAL'
  | 'FLEET_EVENT_REMINDER'
  | 'FLEET_EVENT_CANCELLED'
  | 'FLEET_EVENT_MOVED'
  | 'FLEET_EVENT_PROMOTED'
  | 'FLEET_OWNERSHIP'
  | 'FLEET_SUSPENSION'
  | 'FLEET_MEMBERSHIP'
  | 'FLEET_ARMADA'
  | 'FLEET_TRANSCRIPT';

/** How often notification emails go out. */
export type EmailFrequency = 'INSTANT' | 'DAILY' | 'WEEKLY';

/** The headings Settings lists the switches under. */
export type NotificationEmailGroup =
  'ACCOUNT' | 'STORYTIME' | 'FRIENDS' | 'FLEET';

/** One email switch, as Settings shows it. */
export interface NotificationEmailOption {
  readonly type: NotificationEmailType;
  readonly group: NotificationEmailGroup;
  /** Its label, which the help and every email's footer quote. */
  readonly label: string;
}

/** Every switch, in the order Settings lists them. */
export const NOTIFICATION_EMAIL_OPTIONS: readonly NotificationEmailOption[] = [
  { type: 'LOGIN', group: 'ACCOUNT', label: 'Login alerts' },
  {
    type: 'STORYTIME_STORY_INVITE',
    group: 'STORYTIME',
    label: 'Invitations to help write a Story',
  },
  {
    type: 'STORYTIME_ARC_INVITE',
    group: 'STORYTIME',
    label: 'Invitations to help with an Arc',
  },
  {
    type: 'STORYTIME_MODERATION',
    group: 'STORYTIME',
    label: 'Moderation of my work',
  },
  { type: 'STORYTIME_APPEAL', group: 'STORYTIME', label: 'Appeal decisions' },
  {
    type: 'STORYTIME_SPOTLIGHT',
    group: 'STORYTIME',
    label: 'Storytime Spotlight',
  },
  { type: 'STORYTIME_FOLLOWER', group: 'STORYTIME', label: 'New followers' },
  {
    type: 'STORYTIME_COMMENT',
    group: 'STORYTIME',
    label: 'Comments on my work',
  },
  {
    type: 'STORYTIME_REPLY',
    group: 'STORYTIME',
    label: 'Replies to my comments',
  },
  {
    type: 'STORYTIME_REACTION',
    group: 'STORYTIME',
    label: 'Reactions to my work',
  },
  {
    type: 'STORYTIME_FOLLOWED_PUBLICATION',
    group: 'STORYTIME',
    label: 'New Stories and Chapters I follow',
  },
  { type: 'FRIEND_REQUEST', group: 'FRIENDS', label: 'Friend requests' },
  {
    type: 'FRIEND_ACCEPTED',
    group: 'FRIENDS',
    label: 'Accepted friend requests',
  },
  { type: 'FLEET_MENTION', group: 'FLEET', label: 'Chat mentions' },
  { type: 'FLEET_REPLY', group: 'FLEET', label: 'Chat replies' },
  { type: 'FLEET_DIRECT_MESSAGE', group: 'FLEET', label: 'Direct messages' },
  {
    type: 'FLEET_ROSTER_PROPOSAL',
    group: 'FLEET',
    label: 'Roster association proposals',
  },
  { type: 'FLEET_EVENT_REMINDER', group: 'FLEET', label: 'Event reminders' },
  { type: 'FLEET_EVENT_CANCELLED', group: 'FLEET', label: 'Cancelled events' },
  { type: 'FLEET_EVENT_MOVED', group: 'FLEET', label: 'Moved events' },
  {
    type: 'FLEET_EVENT_PROMOTED',
    group: 'FLEET',
    label: 'Places freed for me at events',
  },
  { type: 'FLEET_OWNERSHIP', group: 'FLEET', label: 'Community ownership' },
  {
    type: 'FLEET_SUSPENSION',
    group: 'FLEET',
    label: 'Suspensions and reinstatements',
  },
  {
    type: 'FLEET_MEMBERSHIP',
    group: 'FLEET',
    label: 'Fleet membership changes',
  },
  { type: 'FLEET_ARMADA', group: 'FLEET', label: 'Armada changes' },
  {
    type: 'FLEET_TRANSCRIPT',
    group: 'FLEET',
    label: 'Chat transcripts ready',
  },
];

/** What each heading is called. */
export const NOTIFICATION_EMAIL_GROUP_LABELS: Readonly<
  Record<NotificationEmailGroup, string>
> = {
  ACCOUNT: 'Account',
  STORYTIME: 'Storytime',
  FRIENDS: 'Friends',
  FLEET: 'Fleet',
};

/** The frequency choices, and how the page names each. */
export const EMAIL_FREQUENCY_OPTIONS: readonly {
  readonly value: EmailFrequency;
  readonly label: string;
}[] = [
  { value: 'INSTANT', label: 'Instantly' },
  { value: 'DAILY', label: 'In a daily digest' },
  { value: 'WEEKLY', label: 'In a weekly digest' },
];

/** What the frequency chooser is called. */
export const EMAIL_FREQUENCY_LABEL = 'Send notification emails';

/** The mark beside the login alert. */
export const RECOMMENDED_LABEL = 'Recommended';
