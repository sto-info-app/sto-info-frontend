import { Relationship } from './community.models';

/**
 * Ordering options supported by the registry profile listing. Values match the
 * `sort` query parameter accepted by the API.
 */
export enum RegistrySort {
  USERNAME = 'username',
  RECENTLY_JOINED = 'recently-joined',
  RECENTLY_ACTIVE = 'recently-active',
}

/**
 * The list page variants, selected by route data.
 */
export type RegistryListMode =
  'all' | 'search' | 'recently-joined' | 'recently-active';

/**
 * Query parameters accepted by the registry profile listing.
 */
export interface RegistryQuery {
  search?: string;
  sort?: RegistrySort;
  page?: number;
  pageSize?: number;
}

/**
 * A named reference value with its icon.
 */
export interface RegistryLookup {
  name: string;
  iconUrl: string | null;
}

/**
 * A captain's rank, derived from their level and starting faction.
 */
export interface RegistryRank {
  title: string;
  iconUrl: string | null;
  levelRange: string;
}

/**
 * Public summary of a captain.
 */
export interface RegistryCharacterSummary {
  handle: string;
  slug: string;
  level: number | null;
  rank: RegistryRank | null;
  species: RegistryLookup | null;
  class: RegistryLookup | null;
  sex: RegistryLookup | null;
  faction: RegistryLookup | null;
  generalFaction: RegistryLookup | null;
  recruitType: RegistryLookup | null;
  profilePicture100: string | null;
  profilePicture300: string | null;
}

/**
 * Public detail view of a captain.
 */
export interface RegistryCharacter extends RegistryCharacterSummary {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  biography: string | null;
  createdDate: string | null;
}

/**
 * Public summary of an STO account.
 */
export interface RegistryAccountSummary {
  handle: string;
  slug: string;
  platformName: string | null;
  launcherName: string | null;
  accountTypeImageUrl: string;
  lifetimeSubscription: boolean;
  accountCreatedDate: string | null;
  publicCharacterCount: number;
}

/**
 * Public detail view of an STO account and its visible captains.
 */
export interface RegistryAccount extends RegistryAccountSummary {
  characters: RegistryCharacterSummary[];
}

/**
 * Public summary of a registry member.
 */
export interface RegistryProfileSummary {
  username: string;
  profilePicture100: string | null;
  profilePicture300: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
  publicAccountCount: number;
  publicCharacterCount: number;
  /**
   * How the signed-in viewer relates to this member, or null when the request
   * was anonymous. Members on either end of a block never appear at all, so
   * this is never `BLOCKED` in a listing.
   */
  relationship: Relationship | null;
}

/**
 * Public detail view of a registry member and their visible accounts.
 */
export interface RegistryProfile extends RegistryProfileSummary {
  accounts: RegistryAccountSummary[];
}

/**
 * A page of registry member summaries.
 */
export interface PaginatedRegistryProfiles {
  items: RegistryProfileSummary[];
  total: number;
  page: number;
  pageSize: number;
}
