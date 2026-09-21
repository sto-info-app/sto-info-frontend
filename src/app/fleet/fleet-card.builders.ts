import {
  FLEET_SCOPE_ARMADA,
  FLEET_SCOPE_COMMUNITY,
  FLEET_SCOPE_FLEET,
} from 'src/app/fleet/constants/fleet-scope.constants';
import {
  FleetScopeCardEmblem,
  FleetScopeCardStatus,
  FleetScopeCardVm,
} from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  FleetCommunityCard,
  FleetDirectoryCard,
  FleetRecruitmentState,
  FleetScopeStatus,
  InGameScopeCard,
  StoArmadaCard,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
} from 'src/app/shared/constants/app-image-assets.constants';

/**
 * Writes an instant out for a reader.
 *
 * Supplied by the page rather than done here, because deciding which timezone
 * a moment is written in belongs to the page: it is the thing that knows
 * whether it holds an instant or a day somebody typed, and the reader's chosen
 * zone reaches it through a pipe rather than through a pure function.
 */
export type InstantFormatter = (value: string) => string;

/** What the pill says, and the colour it says it in. */
const RECRUITMENT_PILLS: Readonly<
  Record<FleetRecruitmentState, FleetScopeCardStatus>
> = {
  [FleetRecruitmentState.OPEN]: {
    label: 'Recruiting',
    modifier: 'recruiting',
  },
  [FleetRecruitmentState.APPLICATION]: {
    label: 'Applications open',
    modifier: 'application',
  },
  [FleetRecruitmentState.INVITE_ONLY]: {
    label: 'Invitation only',
    modifier: 'invite',
  },
  [FleetRecruitmentState.CLOSED]: {
    label: 'Not recruiting',
    modifier: 'closed',
  },
};

/** What the pill says when the record is not operating normally. */
const LIFECYCLE_PILLS: Readonly<
  Partial<Record<FleetScopeStatus, FleetScopeCardStatus>>
> = {
  [FleetScopeStatus.SUSPENDED]: { label: 'Suspended', modifier: 'suspended' },
  [FleetScopeStatus.CLOSED]: { label: 'Closed', modifier: 'closed' },
};

/**
 * Turns an image reference into somewhere to fetch the picture from.
 *
 * @param card - The card as the server sent it.
 * @returns The emblem to draw, or null when the scope has none.
 */
function emblemOf(card: FleetDirectoryCard): FleetScopeCardEmblem | null {
  if (card.emblemImageId === null) {
    return null;
  }

  return {
    url: `${BASE_CLOUDFLARE_IMAGES_URL}/${card.emblemImageId}/${CLOUDFLARE_VARIANT_SQUARE_100PX_NAME}`,
    // An empty description is the right markup for a picture nobody described,
    // and reads as decoration rather than as a missing sentence.
    alt: card.emblemImageAlt ?? '',
  };
}

/**
 * Picks the one thing the pill should say about this record's state.
 *
 * A closed record's recruitment posture is not worth a reader's attention —
 * nothing can be joined — so the lifecycle wins whenever there is one to
 * report, and the recruitment state is shown only while the record is
 * operating.
 *
 * @param status - The record's lifecycle state.
 * @param recruitment - Its recruitment posture, where it has one.
 * @returns The pill, or null when there is nothing to say.
 */
function pillFor(
  status: FleetScopeStatus,
  recruitment: FleetRecruitmentState | null,
): FleetScopeCardStatus | null {
  const lifecycle = LIFECYCLE_PILLS[status] ?? null;

  if (lifecycle !== null) {
    return lifecycle;
  }

  return recruitment === null ? null : RECRUITMENT_PILLS[recruitment];
}

/**
 * Says how many other records answer to this one's name.
 *
 * The point of the whole directory, stated on the card that prompted the
 * question: somebody about to register a fourth "Starfleet Command" is told
 * before they start rather than after they finish.
 *
 * @param card - The record.
 * @returns The line to show, or null when this name is unique here.
 */
function duplicateLine(card: InGameScopeCard): string | null {
  if (card.duplicateCount === 0) {
    return null;
  }

  const records =
    card.duplicateCount === 1 ? 'record answers' : 'records answer';

  return `${card.duplicateCount} other ${records} to this name on ${card.platformName}`;
}

/**
 * Builds the card for a Fleet Community.
 *
 * @param card - The Community as the server sent it.
 * @returns What the card component should draw.
 */
export function buildCommunityCardVm(
  card: FleetCommunityCard,
): FleetScopeCardVm {
  return {
    id: card.id,
    scope: FLEET_SCOPE_COMMUNITY,
    emblem: emblemOf(card),
    name: card.name,
    // A Community holds Fleets rather than sitting in something, and it spans
    // every platform, so both of these are somebody else's column.
    communityName: null,
    platform: null,
    link: FLEET_LINKS.community(card.slug),
    unlinkedTitle: null,
    status: pillFor(card.status, card.recruitmentState),
    lastObservedLabel: null,
    meta: card.description === null ? [] : [card.description],
    actions: [],
  };
}

/**
 * Builds the card for a Fleet.
 *
 * @param card - The Fleet as the server sent it.
 * @param formatInstant - Writes a roster import date out for the reader.
 * @returns What the card component should draw.
 */
export function buildFleetCardVm(
  card: StoFleetCard,
  formatInstant: InstantFormatter,
): FleetScopeCardVm {
  // An unregistered Fleet has no Community, and the slug index and the
  // canonical address both start from one, so there is nowhere to send a
  // reader who clicks it. Saying why is better than a link that goes nowhere.
  const communitySlug = card.communitySlug;

  return {
    id: card.id,
    scope: FLEET_SCOPE_FLEET,
    emblem: emblemOf(card),
    name: card.exactGameName,
    communityName: card.communityName,
    platform: card.platformName,
    link:
      communitySlug === null
        ? null
        : FLEET_LINKS.fleet(communitySlug, card.platformSegment, card.slug),
    unlinkedTitle:
      communitySlug === null
        ? 'Nobody has registered this Fleet to a Community, so it has no page of its own.'
        : null,
    status: pillFor(card.status, card.recruitmentState),
    lastObservedLabel:
      card.lastEffectiveImportAt === null
        ? 'No roster has ever been imported'
        : `Roster last imported ${formatInstant(card.lastEffectiveImportAt)}`,
    meta: [duplicateLine(card)].filter((line): line is string => line !== null),
    actions: [],
  };
}

/**
 * Builds the card for an Armada.
 *
 * @param card - The Armada as the server sent it.
 * @returns What the card component should draw.
 */
export function buildArmadaCardVm(card: StoArmadaCard): FleetScopeCardVm {
  // The exact game name is the identity, so that is the heading; a Community
  // that prefers to call it something else gets its preference said beneath,
  // where it cannot be mistaken for the name the game holds.
  const alias =
    card.displayName === null || card.displayName === card.exactGameName
      ? null
      : `Known as “${card.displayName}”`;

  return {
    id: card.id,
    scope: FLEET_SCOPE_ARMADA,
    emblem: emblemOf(card),
    name: card.exactGameName,
    communityName: card.communityName,
    platform: card.platformName,
    // An Armada always has a Community; the shared card type says otherwise
    // only because it is shared with the Fleet card, which does not.
    link:
      card.communitySlug === null
        ? null
        : FLEET_LINKS.armada(
            card.communitySlug,
            card.platformSegment,
            card.slug,
          ),
    unlinkedTitle:
      card.communitySlug === null
        ? 'This Armada’s Community could not be read, so it cannot be opened.'
        : null,
    // An Armada recruits nobody: it groups Fleets. So the pill speaks only
    // when the record itself has stopped operating.
    status: pillFor(card.status, null),
    // Nothing imports a roster for an Armada, so there is nothing to be fresh.
    lastObservedLabel: null,
    meta: [alias, duplicateLine(card)].filter(
      (line): line is string => line !== null,
    ),
    actions: [],
  };
}
