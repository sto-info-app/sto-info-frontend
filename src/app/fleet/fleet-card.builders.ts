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
import {
  emblemOf as pictureEmblemOf,
  FLEET_EMBLEM_SIZES,
} from 'src/app/fleet/fleet-artwork';
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

/**
 * Writes an instant out for a reader.
 *
 * Supplied by the page rather than done here, because deciding which timezone
 * a moment is written in belongs to the page: it is the thing that knows
 * whether it holds an instant or a day somebody typed, and the reader's chosen
 * zone reaches it through a pipe rather than through a pure function.
 */
export type InstantFormatter = (value: string) => string;

/**
 * What the pill says, and the colour it says it in.
 *
 * Exported because the directory's recruitment filter is labelled from it. A
 * reader picking "Applications open" should get cards reading "Applications
 * open", and two lists of the same four words drift.
 */
export const FLEET_RECRUITMENT_PILLS: Readonly<
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
 * The emblem at card size.
 *
 * A directory card carries no banner, so only half of the shared artwork
 * helper is reached from here. A card is a row in a list and the emblem is
 * what a list draws; a banner belongs across the top of the scope's own page.
 *
 * @param card - The card as the server sent it.
 * @returns The emblem to draw, or null when the scope has none.
 */
function emblemOf(card: FleetDirectoryCard): FleetScopeCardEmblem | null {
  return pictureEmblemOf(
    { ...card, bannerImageId: null, bannerImageAlt: null },
    FLEET_EMBLEM_SIZES.CARD,
  );
}

/**
 * Picks the one thing the pill should say about a record's state.
 *
 * Exported because a scope's own page says the same thing in the same words
 * as its card does, and two copies would be two chances for a page to call a
 * suspended Community "recruiting".
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
export function scopeStatusPill(
  status: FleetScopeStatus,
  recruitment: FleetRecruitmentState | null,
): FleetScopeCardStatus | null {
  const lifecycle = LIFECYCLE_PILLS[status] ?? null;

  if (lifecycle !== null) {
    return lifecycle;
  }

  return recruitment === null ? null : FLEET_RECRUITMENT_PILLS[recruitment];
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
    status: scopeStatusPill(card.status, card.recruitmentState),
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
  // A Fleet with no Community still has a page: it is addressed under the
  // reserved `standalone` segment, where a Community's slug would sit.
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
        ? FLEET_LINKS.standaloneFleet(card.platformSegment, card.slug)
        : FLEET_LINKS.fleet(communitySlug, card.platformSegment, card.slug),
    unlinkedTitle: null,
    status: scopeStatusPill(card.status, card.recruitmentState),
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
    status: scopeStatusPill(card.status, null),
    // Nothing imports a roster for an Armada, so there is nothing to be fresh.
    lastObservedLabel: null,
    meta: [alias, duplicateLine(card)].filter(
      (line): line is string => line !== null,
    ),
    actions: [],
  };
}
