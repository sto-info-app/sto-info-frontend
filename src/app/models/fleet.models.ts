/**
 * Which parts of Fleet Community are currently switched on.
 */
export interface FleetFeatureState {
  isEnabled: boolean;
  registrationEnabled: boolean;
  importsEnabled: boolean;
  chatEnabled: boolean;
}

/**
 * The published access and retention figures, as the server states them.
 *
 * Served rather than held in client code so that the numbers a user reads are
 * the ones the server enforces. A client with its own copy would go on saying
 * "the last four hours" after the server stopped meaning it.
 */
export interface FleetPolicy {
  chatMemberHistoryHours: number;
  chatTranscriptHistoryDays: number;
  customChannelLimit: number;
  chatRetentionDays: number;
  importSourceRetentionDays: number;
}

/**
 * What the client needs to render Fleet Community consistently with the server.
 */
export interface FleetConfiguration {
  features: FleetFeatureState;
  policy: FleetPolicy;
}

/**
 * The feature state assumed before the server has answered, or when it cannot.
 *
 * Everything off. A Fleet control that appeared and then vanished would be
 * worse than one that arrives a moment late, and a client that assumed the
 * feature was on would offer a page the server will refuse.
 */
export const FLEET_FEATURES_DISABLED: FleetFeatureState = {
  isEnabled: false,
  registrationEnabled: false,
  importsEnabled: false,
  chatEnabled: false,
};

/**
 * Lifecycle state of a Community, Fleet or Armada record.
 *
 * A closed scope keeps its web address and stays readable; closure stops new
 * activity rather than removing the record, so the Armada links and roster
 * history recorded against it survive.
 */
export enum FleetScopeStatus {
  /** Operating normally. */
  ACTIVE = 'ACTIVE',
  /** Administratively held; readable, but no new activity is accepted. */
  SUSPENDED = 'SUSPENDED',
  /** Closed by its owner. Retained for history and never reopened in place. */
  CLOSED = 'CLOSED',
}

/**
 * How a Fleet or Community accepts new members.
 *
 * The posture only: it decides whether an application may be started, never
 * whether one is approved.
 */
export enum FleetRecruitmentState {
  /** Anyone eligible may join without an application. */
  OPEN = 'OPEN',
  /** Joining requires an application that an Officer or Admin decides. */
  APPLICATION = 'APPLICATION',
  /** Only an invitation from within the scope can start membership. */
  INVITE_ONLY = 'INVITE_ONLY',
  /** Not recruiting. Existing members are unaffected. */
  CLOSED = 'CLOSED',
}

/**
 * How a directory listing is ordered.
 *
 * `FRESHNESS` is accepted by the Fleet listing alone. Nothing observes a
 * Community or an Armada, so neither has a roster import to be fresh, and the
 * server answers `400` rather than quietly ordering by something else.
 */
export enum FleetDirectorySort {
  /** Exact game name, A–Z, so records answering to one name sit together. */
  NAME = 'NAME',
  /** Most recently registered first. */
  NEWEST = 'NEWEST',
  /** Newest effective roster import first, records with none last. */
  FRESHNESS = 'FRESHNESS',
}

/**
 * Which lifecycle states a directory listing includes.
 *
 * Closed scopes are hidden by default and reachable by filter, because the two
 * people using a directory want opposite things. Somebody looking for a Fleet
 * to join wants the ones that still exist; somebody checking whether a name is
 * already taken wants every record there has ever been, and being shown only
 * the live ones would tell them the name is free when it is not.
 */
export enum FleetDirectoryStatusFilter {
  /** Operating scopes alone. The default. */
  ACTIVE = 'ACTIVE',
  /** Closed scopes alone, for checking what a name once belonged to. */
  CLOSED = 'CLOSED',
  /** Every record, whatever its state, including suspended ones. */
  ANY = 'ANY',
}

/**
 * What every directory card carries, whatever scope it describes.
 *
 * The emblem arrives with its description rather than beside it, because a
 * picture whose alternative text comes in a second request renders without one
 * for as long as that request takes. There is no banner here: a card is a row
 * in a list, and a banner is five times as wide as it is tall.
 */
export interface FleetDirectoryCard {
  id: string;
  slug: string;
  status: FleetScopeStatus;
  createdAt: string;
  emblemImageId: string | null;
  emblemImageAlt: string | null;
}

/**
 * One Fleet Community in the directory.
 *
 * No duplicate count. A Community names a group of people rather than claiming
 * something the game holds exactly once, so two Communities sharing a name are
 * not two records of one thing.
 */
export interface FleetCommunityCard extends FleetDirectoryCard {
  name: string;
  description: string | null;
  recruitmentState: FleetRecruitmentState;
}

/**
 * A card describing a record of something that exists in game.
 *
 * `exactGameName` is held exactly as the game writes it, edge spaces included.
 * Those spaces must stay visible wherever the name is shown: they may be the
 * only thing telling two records apart.
 */
export interface InGameScopeCard extends FleetDirectoryCard {
  exactGameName: string;
  communityId: string | null;
  communityName: string | null;
  communitySlug: string | null;
  platformId: string;
  platformName: string;
  platformSegment: string;

  /**
   * How many *other* listed records answer to the same name on the same
   * platform. Zero for all but a handful.
   */
  duplicateCount: number;
}

/**
 * One Fleet in the directory.
 */
export interface StoFleetCard extends InGameScopeCard {
  recruitmentState: FleetRecruitmentState;
  allegianceFactionId: string | null;

  /**
   * Export instant of its newest effective roster import, which is how fresh
   * the record is. Null means nothing has ever been imported for it.
   */
  lastEffectiveImportAt: string | null;
}

/**
 * One Armada in the directory.
 *
 * An Armada always has a Community, so the inherited Community fields are
 * never null here. They stay nullable rather than being narrowed, because a
 * type that differed from the Fleet card only in nullability would make one
 * component into two.
 */
export interface StoArmadaCard extends InGameScopeCard {
  displayName: string | null;
}

/**
 * A page of directory cards.
 *
 * Offset paging, matching every other listing in the application. The total is
 * part of the answer: "17 Fleets answer to this" is most of what a search for
 * a duplicate is asking.
 */
export interface FleetDirectoryPage<TCard> {
  items: TCard[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * What every directory listing accepts.
 *
 * Anything a particular scope has of its own is declared on its own query,
 * because the server refuses a parameter it does not recognise rather than
 * ignoring it — which is the point: asking an Armada listing for a recruitment
 * state is a misunderstanding, and a `400` says so where a quietly dropped
 * parameter would hand back a list that looks filtered and is not.
 */
export interface FleetDirectoryQuery {
  search?: string;
  status?: FleetDirectoryStatusFilter;
  page?: number;
  pageSize?: number;
}

/**
 * Query parameters accepted by the Fleet Community directory.
 */
export interface FleetCommunityDirectoryQuery extends FleetDirectoryQuery {
  sort?: FleetDirectorySort;
  recruitmentState?: FleetRecruitmentState;
}

/**
 * Query parameters accepted by the Fleet directory.
 *
 * The platform filter matters more than it looks. Two records with the same
 * name on Windows and on Xbox are different Fleets, so narrowing by platform
 * is how a reader stops comparing records that were never the same thing.
 */
export interface StoFleetDirectoryQuery extends FleetDirectoryQuery {
  sort?: FleetDirectorySort;
  platformId?: string;
  recruitmentState?: FleetRecruitmentState;
  allegianceFactionId?: string;

  /**
   * True for Fleets a roster has ever been imported for, false for those none
   * has. Left unset, both are listed.
   */
  withRoster?: boolean;

  /**
   * Only Fleets whose newest effective roster import is within this many days.
   * Implies a roster exists, so it cannot be combined with `withRoster: false`.
   */
  freshWithinDays?: number;
}

/**
 * Query parameters accepted by the Armada directory.
 *
 * No recruitment state and no freshness, because an Armada has neither: it
 * groups Fleets rather than recruiting players, and nothing imports a roster
 * for one.
 */
export interface StoArmadaDirectoryQuery extends FleetDirectoryQuery {
  sort?: FleetDirectorySort;
  platformId?: string;
}

/**
 * Who may see a scope record.
 *
 * A Fleet and a Community each carry one of these; an Armada does not, and
 * is seen exactly as far as the Community holding it.
 */
export enum FleetAudience {
  /** Anyone, including signed-out visitors. */
  PUBLIC = 'PUBLIC',
  /** Subscribers to and members of the owning Community. */
  COMMUNITY = 'COMMUNITY',
  /** Approved members of the Fleet itself. */
  FLEET_MEMBERS = 'FLEET_MEMBERS',
  /** The owning user alone. */
  PRIVATE = 'PRIVATE',
}

/** The artwork every scope can carry, and what each picture shows. */
export interface FleetScopeArtwork {
  bannerImageId: string | null;
  bannerImageAlt: string | null;
  emblemImageId: string | null;
  emblemImageAlt: string | null;
}

/**
 * A Fleet Community as a reader sees it.
 */
export interface FleetCommunity extends FleetScopeArtwork {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string | null;
  recruitmentState: FleetRecruitmentState;
  visibility: FleetAudience;
  preferredTimezone: string;
  status: FleetScopeStatus;
  closedAt: string | null;

  /**
   * The authorisation revision, which is a hint that a cached view is stale
   * and never an access decision of its own.
   */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A Fleet as a reader sees it.
 *
 * `exactGameName` is held exactly as the game writes it, edge spaces
 * included, and those spaces must stay visible wherever the name is shown.
 */
export interface StoFleet extends FleetScopeArtwork {
  id: string;
  communityId: string | null;
  platformId: string;
  platformName: string;
  platformSegment: string;
  exactGameName: string;
  allegianceFactionId: string | null;
  slug: string;
  recruitmentState: FleetRecruitmentState;
  visibility: FleetAudience;
  lastEffectiveImportAt: string | null;
  status: FleetScopeStatus;
  closedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * An Armada as a reader sees it.
 *
 * No visibility of its own, and nothing here says which Fleets are in it:
 * membership is a temporal record with its own route, so a Fleet can leave
 * without this shape changing at all.
 */
export interface StoArmada extends FleetScopeArtwork {
  id: string;
  communityId: string;
  platformId: string;
  platformName: string;
  platformSegment: string;
  exactGameName: string;
  displayName: string | null;
  slug: string;
  status: FleetScopeStatus;
  closedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A Community reached by URL segment, and whether that segment is still its.
 *
 * Answered as a body rather than as a `301`, because the caller is a
 * single-page application resolving a route it is about to render: it has to
 * replace the address in the history stack, which a transparent HTTP
 * redirect would have already followed without telling it (ADR-0022).
 */
export interface ResolvedFleetCommunity {
  community: FleetCommunity;

  /**
   * The retired segment that was asked for, when it was not the current one.
   * Non-null means the address shown should be replaced.
   */
  redirectedFrom: string | null;
}

/**
 * A Fleet reached by its canonical URL.
 *
 * The three segments are answered separately rather than as a path, because
 * the caller is a resolver assembling its own route and a string it has to
 * take apart again helps nobody.
 */
export interface ResolvedStoFleet {
  fleet: StoFleet;
  communitySlug: string;

  /**
   * The holding Community's display name, carried here rather than fetched
   * beside it: a page names the Community holding a record, and a slug is a
   * URL read aloud rather than a name.
   *
   * Null for a standalone Fleet, which has no Community to name. The
   * segment above still has a value, because the address has that position
   * filled — by the word standing for its absence.
   */
  communityName: string | null;
  platformSegment: string;

  /** True when the address asked for is no longer the canonical one. */
  redirected: boolean;
}

/**
 * An Armada reached by its canonical URL.
 */
export interface ResolvedStoArmada {
  armada: StoArmada;
  communitySlug: string;

  /**
   * The holding Community's display name, carried here rather than fetched
   * beside it: a page names the Community holding a record, and a slug is a
   * URL read aloud rather than a name.
   *
   * Null for a standalone Fleet, which has no Community to name. The
   * segment above still has a value, because the address has that position
   * filled — by the word standing for its absence.
   */
  communityName: string | null;
  platformSegment: string;

  /** True when the address asked for is no longer the canonical one. */
  redirected: boolean;
}
