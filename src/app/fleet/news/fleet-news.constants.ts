import { FleetPicture } from 'src/app/fleet/fleet-artwork';
import {
  FleetNewsAudience,
  FleetNewsPostSummary,
} from 'src/app/models/fleet-news.models';

/** What lets somebody write a scope's news (FC-027). */
export const NEWS_WRITE_CAPABILITY = 'news.write';

/** The longest title a post may have. */
export const FLEET_NEWS_TITLE_LIMIT = 200;

/** The longest summary a post may have. */
export const FLEET_NEWS_SUMMARY_LIMIT = 500;

/** The longest post the server keeps. */
export const FLEET_NEWS_BODY_LIMIT = 50000;

/** How many posts a page of a scope's news shows. */
export const FLEET_NEWS_PAGE_SIZE = 10;

/** How many posts the Community page's News section shows. */
export const FLEET_NEWS_LATEST_COUNT = 3;

/**
 * Where a cover is drawn: small on a card in a news list, or across the head
 * of the post.
 */
export type FleetNewsCoverSize = 'card' | 'page';

/**
 * A post's cover at the size it is drawn, where it has one.
 *
 * The card's address is 640 by 360 and the page's 1920 by 1080, so a list
 * does not fetch a picture four times the size it shows, and a post stays
 * sharp across a high-density screen.
 *
 * @param post - The post.
 * @param size - Where it is drawn.
 * @returns The picture, or null.
 */
export function fleetNewsCoverOf(
  post: FleetNewsPostSummary,
  size: FleetNewsCoverSize,
): FleetPicture | null {
  if (!post.coverImageUrls) {
    return null;
  }

  return {
    // Signed by the API (FC-040); the browser never builds an address.
    url:
      size === 'card'
        ? post.coverImageUrls.cover640x360
        : post.coverImageUrls.cover1920x1080,
    // An empty description reads as decoration rather than a gap.
    alt: post.coverImageAlt ?? '',
  };
}

/** The audiences a post may be published to, in the order offered. */
export const FLEET_NEWS_AUDIENCES: readonly FleetNewsAudience[] = [
  'PUBLIC',
  'COMMUNITY',
  'FLEET_MEMBERS',
];

/** What kind of scope a post belongs to, for its wording. */
export type FleetNewsScopeKind = 'COMMUNITY' | 'FLEET' | 'ARMADA';

/**
 * Who each audience is, worded for the kind of scope.
 *
 * Written as who can read the post rather than as the value's name. A
 * Fleet's members are its approved members; an Armada's are the members of
 * the Fleets placed in it; a Community's are the members of every Fleet in
 * it, with its Owner and Admins (FC-050).
 *
 * @param audience - The audience.
 * @param kind - The kind of scope the post belongs to.
 * @returns Who may read it.
 */
export function fleetNewsAudienceLabel(
  audience: FleetNewsAudience,
  kind: FleetNewsScopeKind,
): string {
  switch (audience) {
    case 'PUBLIC':
      return 'Anyone, including signed-out visitors';
    case 'COMMUNITY':
      return 'The Community’s followers and members';
    case 'FLEET_MEMBERS':
      return {
        COMMUNITY: 'Members of the Community’s Fleets, its Owner and Admins',
        FLEET: 'Approved members of the Fleet',
        ARMADA: 'Members of the Armada’s Fleets',
      }[kind];
  }
}

/** The short badge each audience carries on a post. */
export const FLEET_NEWS_AUDIENCE_BADGES: Readonly<
  Record<FleetNewsAudience, string>
> = {
  PUBLIC: 'Public',
  COMMUNITY: 'Community',
  FLEET_MEMBERS: 'Members only',
};
