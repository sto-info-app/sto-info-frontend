/**
 * How the authenticated viewer relates to the member they are looking at.
 * Values match the `status` returned by the API.
 */
export enum RelationshipStatus {
  SELF = 'SELF',
  NONE = 'NONE',
  REQUEST_SENT = 'REQUEST_SENT',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  FRIENDS = 'FRIENDS',
  BLOCKED = 'BLOCKED',
}

/**
 * Which way a pending friend request points, relative to the viewer.
 */
export enum FriendRequestDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

/**
 * The tabs offered by the friends page.
 */
export type FriendsTab = 'friends' | 'incoming' | 'outgoing' | 'blocked';

/**
 * The public face of a member in a friend or blocked list.
 */
export interface CommunityMember {
  username: string;
  profilePicture100: string | null;
  profilePicture300: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
  publicAccountCount: number;
  publicCharacterCount: number;
  /**
   * False once a member has made their record private. They stay in the list,
   * but their profile can no longer be opened.
   */
  publiclyVisible: boolean;
}

/**
 * An accepted friendship, from the viewer's point of view.
 */
export interface Friend {
  id: string;
  member: CommunityMember;
  friendsSince: string | null;
}

/**
 * A friend request still awaiting a response.
 */
export interface FriendRequest {
  id: string;
  direction: FriendRequestDirection;
  member: CommunityMember;
  requestedAt: string;
}

/**
 * A member the viewer has blocked.
 */
export interface BlockedMember {
  id: string;
  member: CommunityMember;
  blockedAt: string;
  reason: string | null;
}

/**
 * A page of accepted friendships.
 */
export interface PaginatedFriends {
  items: Friend[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Headline counts driving the friends page tab badges.
 */
export interface CommunitySummary {
  friendCount: number;
  incomingRequestCount: number;
  outgoingRequestCount: number;
  blockedCount: number;
}

/**
 * How the viewer relates to a member, with the row IDs the matching action
 * needs. Null when the viewer is not signed in.
 */
export interface Relationship {
  status: RelationshipStatus;
  friendshipId: string | null;
  blockId: string | null;
}

/**
 * Query parameters accepted by the friend listing.
 */
export interface FriendsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Payload for sending a friend request.
 */
export interface CreateFriendRequest {
  username: string;
}

/**
 * Payload for blocking a member.
 */
export interface CreateBlockRequest {
  username: string;
  reason?: string;
}
