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

/**
 * Each switch's label, in the order Settings lists them. The help and every
 * email's footer quote these.
 */
export const NOTIFICATION_EMAIL_LABELS: Readonly<
  Record<NotificationEmailType, string>
> = {
  LOGIN: 'Login alerts',
  STORYTIME_STORY_INVITE: 'Invitations to help write a Story',
  STORYTIME_ARC_INVITE: 'Invitations to help with an Arc',
  STORYTIME_MODERATION: 'Moderation of my work',
  STORYTIME_APPEAL: 'Appeal decisions',
  STORYTIME_SPOTLIGHT: 'Storytime Spotlight',
  STORYTIME_FOLLOWER: 'New followers',
  STORYTIME_COMMENT: 'Comments on my work',
  STORYTIME_REPLY: 'Replies to my comments',
  STORYTIME_REACTION: 'Reactions to my work',
  STORYTIME_FOLLOWED_PUBLICATION: 'New Stories and Chapters I follow',
  FRIEND_REQUEST: 'Friend requests',
  FRIEND_ACCEPTED: 'Accepted friend requests',
  FLEET_MENTION: 'Chat mentions',
  FLEET_REPLY: 'Chat replies',
  FLEET_DIRECT_MESSAGE: 'Direct messages',
  FLEET_ROSTER_PROPOSAL: 'Roster association proposals',
  FLEET_EVENT_REMINDER: 'Event reminders',
  FLEET_EVENT_CANCELLED: 'Cancelled events',
  FLEET_EVENT_MOVED: 'Moved events',
  FLEET_EVENT_PROMOTED: 'Places freed for me at events',
  FLEET_OWNERSHIP: 'Community ownership',
  FLEET_SUSPENSION: 'Suspensions and reinstatements',
  FLEET_MEMBERSHIP: 'Fleet membership changes',
  FLEET_ARMADA: 'Armada changes',
  FLEET_TRANSCRIPT: 'Chat transcripts ready',
};

/** The heading each type's name begins with; the login alert has its own. */
const GROUP_PREFIXES: readonly (readonly [string, NotificationEmailGroup])[] = [
  ['STORYTIME_', 'STORYTIME'],
  ['FRIEND_', 'FRIENDS'],
  ['FLEET_', 'FLEET'],
];

/**
 * The heading a switch is listed under.
 *
 * @param type - The kind of email.
 * @returns Its heading.
 */
export function notificationEmailGroupOf(
  type: NotificationEmailType,
): NotificationEmailGroup {
  return (
    GROUP_PREFIXES.find(([prefix]) => type.startsWith(prefix))?.[1] ?? 'ACCOUNT'
  );
}

/** Every switch, in the order Settings lists them. */
export const NOTIFICATION_EMAIL_OPTIONS: readonly NotificationEmailOption[] = (
  Object.keys(NOTIFICATION_EMAIL_LABELS) as NotificationEmailType[]
).map(type => ({
  type,
  group: notificationEmailGroupOf(type),
  label: NOTIFICATION_EMAIL_LABELS[type],
}));

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
