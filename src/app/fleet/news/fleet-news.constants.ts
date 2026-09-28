import { FleetNewsAudience } from 'src/app/models/fleet-news.models';

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
 * the Fleets placed in it.
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
        COMMUNITY: 'Members of the Community',
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
