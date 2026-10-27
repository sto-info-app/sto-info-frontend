import { formatDate } from '@angular/common';
import {
  MemberCardAction,
  MemberCardBadge,
  MemberCardDetail,
  MemberCardVm,
} from 'src/app/shared/components/member-card/member-card.model';
import {
  CommunityMember,
  Friend,
  RelationshipStatus,
} from './models/community.models';
import { RegistryProfileSummary } from './models/registry.models';
import { buildRegistryProfileLink } from './registry/registry-card.builders';

/** Action keys emitted by the member cards on the community pages. */
/** How a card writes its dates: the month in full, or shortened. */
type MemberDateFormat = 'longDate' | 'mediumDate';

/** The registry has the width for "February 24, 2026". */
const REGISTRY_DATE_FORMAT: MemberDateFormat = 'longDate';

/**
 * The friends list sits beside a side bar that takes a third of the page, so
 * its dates are shortened to "Feb 24, 2026" rather than wrap to a second
 * line.
 */
const FRIEND_DATE_FORMAT: MemberDateFormat = 'mediumDate';

export const MEMBER_CARD_ADD_FRIEND = 'add-friend';
export const MEMBER_CARD_CHAT = 'chat';
export const MEMBER_CARD_ACCEPT_REQUEST = 'accept-request';
export const MEMBER_CARD_UNFRIEND = 'unfriend';
export const MEMBER_CARD_BLOCK = 'block';

/**
 * The fields every member listing carries, whichever endpoint returned them.
 * Both `CommunityMember` and `RegistryProfileSummary` satisfy it.
 */
type MemberCardSource = Pick<
  CommunityMember,
  | 'username'
  | 'profilePicture100'
  | 'joinedAt'
  | 'lastActiveAt'
  | 'playingSince'
  | 'publicAccountCount'
  | 'publicCharacterCount'
>;

/**
 * Badge copy per relationship. A member on either end of a block never reaches
 * a listing, so `BLOCKED` has no entry here.
 */
const RELATIONSHIP_BADGES: Partial<
  Record<RelationshipStatus, MemberCardBadge>
> = {
  [RelationshipStatus.SELF]: { label: 'You', modifier: 'self' },
  [RelationshipStatus.FRIENDS]: { label: 'Friend', modifier: 'friend' },
  [RelationshipStatus.REQUEST_SENT]: {
    label: 'Request sent',
    modifier: 'pending',
  },
  [RelationshipStatus.REQUEST_RECEIVED]: {
    label: 'Wants to be friends',
    modifier: 'pending',
  },
};

/**
 * Maps a public registry member onto the shared member card model.
 *
 * @param profile - The public member summary.
 * @param canAct - Whether the viewer is signed in, and so may act on them.
 * @param timezone - The zone to render instants in; the browser's when absent.
 * @returns The card presentation model.
 */
export function buildRegistryMemberCard(
  profile: RegistryProfileSummary,
  canAct: boolean,
  timezone?: string,
  chatOffered = false,
): MemberCardVm {
  const status = profile.relationship?.status ?? null;

  return {
    ...buildMemberCardBase(
      profile.username,
      profile,
      buildRegistryProfileLink(profile.username),
    ),
    badge: status ? (RELATIONSHIP_BADGES[status] ?? null) : null,
    siteDetails: buildSiteDetails(profile, timezone),
    gameDetails: buildGameDetails(profile),
    actions: buildRegistryActions(
      profile.username,
      status,
      canAct,
      chatOffered,
    ),
  };
}

/**
 * Maps an accepted friendship onto the shared member card model, so the friends
 * list reads exactly as the registry listing it was found from.
 *
 * No relationship badge: every card in the friends list is a friend, so the
 * pill the registry listing carries would say the same thing on every one.
 *
 * @param friend - The accepted friendship.
 * @param timezone - The zone to render instants in; the browser's when absent.
 * @returns The card presentation model.
 */
export function buildFriendMemberCard(
  friend: Friend,
  timezone?: string,
  chatOffered = false,
): MemberCardVm {
  const member = friend.member;

  return {
    ...buildMemberCardBase(
      friend.id,
      member,
      // A friend who has since made their record private stays in the list,
      // but their profile can no longer be opened.
      member.publiclyVisible ? buildRegistryProfileLink(member.username) : null,
    ),
    badge: null,
    // The friends list sits beside a side bar, where a long date wraps.
    siteDetails: buildFriendSiteDetails(friend, timezone),
    gameDetails: buildGameDetails(member, FRIEND_DATE_FORMAT),
    actions: [
      ...(chatOffered ? [buildChatAction(member.username)] : []),
      buildUnfriendAction(member.username),
    ],
  };
}

/**
 * Marks a member's card with whether they are online (FC-034).
 *
 * @param card - The card.
 * @param online - Who is online, by username.
 * @returns The card, marked online or not.
 */
export function withPresence(
  card: MemberCardVm,
  online: ReadonlySet<string>,
): MemberCardVm {
  return { ...card, online: online.has(card.username) };
}

/**
 * Builds the identity and counts every member card shares.
 *
 * @param id - Stable identity for list tracking.
 * @param member - The member the card represents.
 * @param link - The member's record, or null when it cannot be opened.
 * @returns The common half of the card presentation model.
 */
function buildMemberCardBase(
  id: string,
  member: MemberCardSource,
  link: string[] | null,
): Omit<MemberCardVm, 'badge' | 'siteDetails' | 'gameDetails' | 'actions'> {
  return {
    id,
    username: member.username,
    imageUrl: member.profilePicture100,
    link,
    unlinkedTitle: 'This officer has made their record private.',
    // Until presence is read: see `withPresence`.
    online: false,
  };
}

/**
 * What the member has in the game: their public accounts and Captains
 * counted, and how long they have played.
 *
 * @param member - The member.
 * @returns The game column.
 */
function buildGameDetails(
  member: MemberCardSource,
  format: MemberDateFormat = REGISTRY_DATE_FORMAT,
): MemberCardDetail[] {
  const details = [
    { label: 'Accounts', value: String(member.publicAccountCount) },
    { label: 'Captains', value: String(member.publicCharacterCount) },
  ];

  // Playing since is a day the member typed, stored as midnight UTC. Rendering
  // it in another zone would move it to the day before, so it keeps the
  // browser's zone rather than the reader's chosen one — the two agree for
  // everybody at or east of UTC, and neither is right for a value that should
  // not have a time at all.
  if (member.playingSince) {
    details.push({
      label: 'Playing since',
      value: formatMemberDate(member.playingSince, undefined, format),
    });
  }

  return details;
}

/**
 * Builds the joined, last-seen and playing-since lines shown on every member
 * card.
 *
 * @param member - The member the card represents.
 * @param timezone - The zone to render instants in; the browser's when absent.
 * @returns The dated details.
 */
function buildSiteDetails(
  member: MemberCardSource,
  timezone?: string,
  format: MemberDateFormat = REGISTRY_DATE_FORMAT,
): MemberCardDetail[] {
  const details = [
    {
      label: 'Joined',
      value: formatMemberDate(member.joinedAt, timezone, format),
    },
  ];

  if (member.lastActiveAt) {
    details.push({
      label: 'Last seen',
      value: formatMemberDate(member.lastActiveAt, timezone, format),
    });
  }

  return details;
}

/**
 * Builds the dated details for a friend, adding when the friendship began.
 *
 * @param friend - The accepted friendship.
 * @param timezone - The zone to render instants in; the browser's when absent.
 * @returns The dated details.
 */
function buildFriendSiteDetails(
  friend: Friend,
  timezone?: string,
): MemberCardDetail[] {
  const details = buildSiteDetails(friend.member, timezone, FRIEND_DATE_FORMAT);

  if (friend.friendsSince) {
    details.push({
      label: 'Friends since',
      value: formatMemberDate(
        friend.friendsSince,
        timezone,
        FRIEND_DATE_FORMAT,
      ),
    });
  }

  return details;
}

/**
 * Formats a card date, as the `date` pipe does across the rest of the app.
 *
 * @param value - The ISO date to format.
 * @param timezone - The zone to render in; the browser's when absent.
 * @param format - The month in full, or shortened.
 * @returns The formatted date.
 */
function formatMemberDate(
  value: string,
  timezone: string | undefined,
  format: MemberDateFormat,
): string {
  return formatDate(value, format, 'en-US', timezone);
}

/**
 * Builds the actions a registry listing offers for a member.
 *
 * Hidden from anonymous visitors and on the viewer's own card. A request the
 * viewer has already sent offers nothing either — withdrawing it is a
 * correction, not something to reach for from a browse listing.
 *
 * @param username - The member the buttons act on.
 * @param status - The viewer's relationship to them, if reported.
 * @param canAct - Whether the viewer is signed in.
 * @returns The action buttons, empty when none apply.
 */
function buildRegistryActions(
  username: string,
  status: RelationshipStatus | null,
  canAct: boolean,
  chatOffered: boolean,
): MemberCardAction[] {
  if (!canAct) {
    return [];
  }

  switch (status) {
    case RelationshipStatus.FRIENDS:
      return [
        ...(chatOffered ? [buildChatAction(username)] : []),
        buildUnfriendAction(username),
        buildBlockAction(username),
      ];

    case RelationshipStatus.REQUEST_RECEIVED:
      return [
        {
          key: MEMBER_CARD_ACCEPT_REQUEST,
          label: 'Accept',
          colourClass: 'green',
          ariaLabel: `Accept the friend request from ${username}`,
        },
        buildBlockAction(username),
      ];

    case RelationshipStatus.NONE:
      return [
        {
          key: MEMBER_CARD_ADD_FRIEND,
          label: 'Add Friend',
          colourClass: 'green',
          ariaLabel: `Add ${username} as a friend`,
        },
        buildBlockAction(username),
      ];

    default:
      return [];
  }
}

/**
 * Builds the Unfriend button, identical wherever ending a friendship is
 * offered.
 *
 * @param username - The member the button acts on.
 * @returns The action.
 */
/**
 * Opens chat with a friend (FC-033), offered only while chat is switched on.
 *
 * @param username - The friend.
 * @returns The action, in the card's own colour: it changes nothing.
 */
function buildChatAction(username: string): MemberCardAction {
  return {
    key: MEMBER_CARD_CHAT,
    label: 'Chat',
    colourClass: '',
    ariaLabel: `Chat with ${username}`,
  };
}

function buildUnfriendAction(username: string): MemberCardAction {
  return {
    key: MEMBER_CARD_UNFRIEND,
    label: 'Unfriend',
    colourClass: 'red',
    ariaLabel: `Unfriend ${username}`,
  };
}

/**
 * Builds the Block button.
 *
 * Red, as the Unfriend button beside it is: red is kept for a control that
 * removes or refuses, and both end the friendship. Their labels tell them
 * apart; only blocking also hides the two members from each other.
 *
 * @param username - The member the button acts on.
 * @returns The action.
 */
function buildBlockAction(username: string): MemberCardAction {
  return {
    key: MEMBER_CARD_BLOCK,
    label: 'Block',
    colourClass: 'red',
    ariaLabel: `Block ${username}`,
  };
}
