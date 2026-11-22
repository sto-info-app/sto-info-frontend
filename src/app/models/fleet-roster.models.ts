/**
 * A Fleet's roster, its history and one member's timeline, as FC-020's
 * routes give them.
 *
 * Everything here is read from one published revision of the Fleet's roster
 * history, and says which. Nothing is dated more exactly than the two
 * exports it lies between: a change carries both, never a day.
 */

import { RosterProfession } from 'src/app/models/fleet-import.models';

/** One effective export, as a reader steps between them. */
export interface RosterExportRef {
  importId: string;
  exportedAt: string;
}

/** Which effective exports the published revision covers. */
export interface RosterCoverage {
  exports: number;
  first: RosterExportRef | null;
  latest: RosterExportRef | null;
}

/** What every read of the roster history says about where it stands. */
export interface RosterRevision {
  /** The revision read. 0 before the first is published. */
  revision: number;
  publishedAt: string | null;
  /** Whether a change is waiting for a newer revision. */
  stale: boolean;
}

/** How a roster page is ordered. */
export enum RosterSort {
  NAME = 'NAME',
  HANDLE = 'HANDLE',
  RANK = 'RANK',
  LEVEL = 'LEVEL',
  JOINED = 'JOINED',
  CONTRIBUTION = 'CONTRIBUTION',
  LAST_ACTIVE = 'LAST_ACTIVE',
}

/** Which way a roster ordering runs. */
export enum RosterSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/** What a roster reader asks for. */
export interface RosterQuery {
  asOf?: string;
  page?: number;
  sort?: RosterSort;
  direction?: RosterSortDirection;
  search?: string;
  rank?: string;
}

/** Where a row's Character has a registry page the reader may open. */
export interface RosterProfileLink {
  username: string;
  accountSlug: string;
  characterSlug: string;
}

/** One row of an export. Never an officer field: none is stored. */
export interface RosterRow {
  line: number;
  /** The member the row belongs to, across renames. */
  identityId: string | null;
  /** How many rows on this export the same member has. */
  identityRows: number;
  characterName: string;
  accountHandle: string;
  level: number;
  className: string;
  profession: RosterProfession | null;
  guildRank: string;
  /** Its tier in the Fleet's rank order, 1 the highest. */
  rankTier: number | null;
  /** As a decimal string: it can exceed what a number holds exactly. */
  contributionTotal: string;
  joinedAt: string | null;
  joinedAtAmbiguous: boolean;
  rankChangedAt: string | null;
  rankChangedAtAmbiguous: boolean;
  lastActiveAt: string | null;
  lastActiveAtAmbiguous: boolean;
  status: string;
  publicComment: string;
  publicCommentEditedAt: string | null;
  /** Only an investigator is shown excluded rows at all. */
  excluded: boolean;
  profile: RosterProfileLink | null;
}

/** The export a roster page shows, and the ones either side of it. */
export interface RosterExport extends RosterExportRef {
  partial: boolean;
  previous: RosterExportRef | null;
  next: RosterExportRef | null;
}

/** A rank label on the export shown, and how many rows hold it. */
export interface RosterRankCount {
  label: string;
  tier: number | null;
  members: number;
}

/** A page of a Fleet's roster, as one export listed it. */
export interface RosterPage extends RosterRevision {
  coverage: RosterCoverage;
  export: RosterExport | null;
  ranks: RosterRankCount[];
  items: RosterRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** What a change to a member was. */
export enum RosterChangeKind {
  JOINED = 'JOINED',
  REJOINED = 'REJOINED',
  LEFT = 'LEFT',
  RENAMED = 'RENAMED',
  RANK_CHANGED = 'RANK_CHANGED',
  JOIN_DATE_CHANGED = 'JOIN_DATE_CHANGED',
  CONTRIBUTION_CHANGED = 'CONTRIBUTION_CHANGED',
  CONTRIBUTION_RESET = 'CONTRIBUTION_RESET',
}

/** A rank change between two tiers of the Fleet's rank order. */
export enum RosterRankMove {
  PROMOTED = 'PROMOTED',
  DEMOTED = 'DEMOTED',
}

/** A member's name and handle, as one export listed them. */
export interface RosterMemberName {
  characterName: string;
  accountHandle: string;
}

/** One change to one member, bounded by the exports it lies between. */
export interface RosterChange {
  identityId: string;
  kind: RosterChangeKind;
  from: RosterExportRef | null;
  to: RosterExportRef;
  /** Bounded more widely than one interval; in no interval's totals. */
  acrossGap: boolean;
  member: RosterMemberName | null;
  /** Null is only "rank changed". */
  rankMove: RosterRankMove | null;
  fromCharacterName?: string;
  fromAccountHandle?: string;
  toCharacterName?: string;
  toAccountHandle?: string;
  fromRank?: string;
  toRank?: string;
  fromJoinedAt?: string;
  toJoinedAt?: string;
  contributionDelta?: string | null;
  fromContribution?: string;
  toContribution?: string;
  baselineContribution?: string;
}

/** What happened between two consecutive effective exports. */
export interface RosterInterval {
  from: RosterExportRef;
  to: RosterExportRef;
  partial: boolean;
  membersAtStart: number;
  membersAtEnd: number;
  joined: number;
  rejoined: number;
  left: number;
  unknown: number;
  renamed: number;
  rankChanged: number;
  joinDateChanged: number;
  acrossGap: number;
  contributionDelta: string;
  contributionKnown: number;
  contributionReset: number;
  contributionBaseline: number;
  contributionUnknown: number;
  changes: RosterChange[];
}

/** The kinds of change the History tab can filter by. */
export const ROSTER_HISTORY_KINDS: readonly RosterChangeKind[] = [
  RosterChangeKind.JOINED,
  RosterChangeKind.REJOINED,
  RosterChangeKind.LEFT,
  RosterChangeKind.RENAMED,
  RosterChangeKind.RANK_CHANGED,
  RosterChangeKind.JOIN_DATE_CHANGED,
];

/** A page of a Fleet's history, newest interval first. */
export interface RosterHistoryPage extends RosterRevision {
  items: RosterInterval[];
  total: number;
  page: number;
  pageSize: number;
}

/** How an episode is known to have begun. */
export enum RosterEpisodeStart {
  FIRST_SEEN = 'FIRST_SEEN',
  JOINED = 'JOINED',
  REJOINED = 'REJOINED',
}

/** How an episode is known to have ended. */
export enum RosterEpisodeEnd {
  LEFT = 'LEFT',
  LEFT_AND_REJOINED = 'LEFT_AND_REJOINED',
}

/** One stretch of a member's membership. */
export interface RosterEpisode {
  ordinal: number;
  startKind: RosterEpisodeStart;
  startedAfter: RosterExportRef | null;
  first: RosterExportRef;
  reportedJoinedAt: string | null;
  reportedJoinedAtAmbiguous: boolean;
  last: RosterExportRef;
  endKind: RosterEpisodeEnd | null;
  endedBefore: string | null;
  endedBeforeImportId: string | null;
  baselineContribution: string | null;
  lastObservedContribution: string | null;
}

/** A member's row on one export. */
export interface RosterMemberRow {
  importId: string;
  exportedAt: string;
  partial: boolean;
  line: number;
  characterName: string;
  accountHandle: string;
  level: number;
  guildRank: string;
  rankTier: number | null;
  contributionTotal: string;
  lastActiveAt: string | null;
  lastActiveAtAmbiguous: boolean;
  excluded: boolean;
}

/** One member's history in a Fleet. */
export interface RosterTimeline extends RosterRevision {
  identityId: string;
  member: RosterMemberName | null;
  profile: RosterProfileLink | null;
  episodes: RosterEpisode[];
  changes: RosterChange[];
  rows: RosterMemberRow[];
}

/** A rank label the Fleet's imports have listed, and where it is placed. */
export interface RosterRankLabel {
  label: string;
  tier: number | null;
}

/** One edit to a Fleet's rank order. */
export interface RosterRankOrderAction {
  id: string;
  actorName: string | null;
  reason: string;
  tiersBefore: string[][];
  tiersAfter: string[][];
  actedAt: string;
}

/** A Fleet's rank order. Labels and actions are an investigator's alone. */
export interface RosterRankOrder {
  /** Tiers highest first, each a list of labels. */
  tiers: string[][];
  labels: RosterRankLabel[] | null;
  actions: RosterRankOrderAction[] | null;
}

/** An investigator's new rank order. */
export interface UpdateRosterRankOrder {
  tiers: string[][];
  /** The order as it was loaded, so an edit made meanwhile is refused. */
  expected: string[][];
  reason: string;
}
