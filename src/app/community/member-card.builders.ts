import { formatDate } from '@angular/common';
import {
  MemberCardAction,
  MemberCardBadge,
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
export const MEMBER_CARD_ADD_FRIEND = 'add-friend';
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
 * @returns The card presentation model.
 */
export function buildRegistryMemberCard(
  profile: RegistryProfileSummary,
  canAct: boolean,
): MemberCardVm {
  const status = profile.relationship?.status ?? null;

  return {
    ...buildMemberCardBase(
      profile.username,
      profile,
      buildRegistryProfileLink(profile.username),
    ),
    badge: status ? (RELATIONSHIP_BADGES[status] ?? null) : null,
    // Reserved whenever the viewer has relationships at all, so the rows below
    // line up across cards that do and do not carry a badge. Dropped entirely
    // for an anonymous visitor, where no card can ever have one and the
    // reserved row would just be a gap.
    reserveBadgeSlot: status !== null,
    meta: buildActivityMeta(profile),
    actions: buildRegistryActions(profile.username, status, canAct),
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
 * @returns The card presentation model.
 */
export function buildFriendMemberCard(friend: Friend): MemberCardVm {
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
    reserveBadgeSlot: false,
    meta: buildFriendMeta(friend),
    actions: [buildUnfriendAction(member.username)],
  };
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
): Omit<MemberCardVm, 'badge' | 'reserveBadgeSlot' | 'meta' | 'actions'> {
  return {
    id,
    username: member.username,
    imageUrl: member.profilePicture100,
    link,
    unlinkedTitle: 'This officer has made their record private.',
    stats: [
      { label: 'Accounts', value: member.publicAccountCount },
      { label: 'Captains', value: member.publicCharacterCount },
    ],
  };
}

/**
 * Builds the joined, last-seen and playing-since lines shown on every member
 * card.
 *
 * @param member - The member the card represents.
 * @returns The meta lines.
 */
function buildActivityMeta(member: MemberCardSource): string[] {
  const meta = [`Joined ${formatMemberDate(member.joinedAt)}`];

  if (member.lastActiveAt) {
    meta.push(`Last seen ${formatMemberDate(member.lastActiveAt)}`);
  }

  if (member.playingSince) {
    meta.push(`Playing since ${formatMemberDate(member.playingSince)}`);
  }

  return meta;
}

/**
 * Builds the meta lines for a friend, adding when the friendship began.
 *
 * @param friend - The accepted friendship.
 * @returns The meta lines.
 */
function buildFriendMeta(friend: Friend): string[] {
  const meta = buildActivityMeta(friend.member);

  if (friend.friendsSince) {
    meta.push(`Friends since ${formatMemberDate(friend.friendsSince)}`);
  }

  return meta;
}

/**
 * Formats a card date, matching the `date: 'longDate'` pipe used across the
 * rest of the app.
 *
 * @param value - The ISO date to format.
 * @returns The formatted date.
 */
function formatMemberDate(value: string): string {
  return formatDate(value, 'longDate', 'en-US');
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
): MemberCardAction[] {
  if (!canAct) {
    return [];
  }

  switch (status) {
    case RelationshipStatus.FRIENDS:
      return [buildUnfriendAction(username), buildBlockAction(username)];

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
          colourClass: 'sunflower',
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
function buildUnfriendAction(username: string): MemberCardAction {
  return {
    key: MEMBER_CARD_UNFRIEND,
    label: 'Unfriend',
    colourClass: 'african-violet',
    ariaLabel: `Unfriend ${username}`,
  };
}

/**
 * Builds the Block button.
 *
 * Kept in the red family, and distinct from the purple unfriend button beside
 * it: both end the friendship, but only blocking also hides the two members
 * from each other.
 *
 * @param username - The member the button acts on.
 * @returns The action.
 */
function buildBlockAction(username: string): MemberCardAction {
  return {
    key: MEMBER_CARD_BLOCK,
    label: 'Block',
    colourClass: 'cardinal',
    ariaLabel: `Block ${username}`,
  };
}
