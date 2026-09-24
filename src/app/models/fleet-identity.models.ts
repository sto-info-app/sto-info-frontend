/**
 * Renames a Fleet's roster suggests, and what its reviewers made of them.
 *
 * Separate from `fleet-import.models.ts` because it describes conclusions
 * drawn across imports rather than any one file. Nothing here is an STO Info
 * account: a roster identity is somebody a roster listed, registered or not.
 */

/** Which kind of rename a candidate suggests. */
export enum RosterIdentityCandidateKind {
  /** The same account handle, under a new Character name. */
  CHARACTER_RENAME = 'CHARACTER_RENAME',

  /** The same Character names, under a new account handle. */
  ACCOUNT_RENAME = 'ACCOUNT_RENAME',
}

/** Where a reviewer has left a candidate. */
export enum RosterIdentityCandidateState {
  OPEN = 'OPEN',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

/** What a reviewer did. */
export enum RosterIdentityDecisionAction {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
  UNDO = 'UNDO',
}

/** How far the checks that are not required agree with the rename. */
export enum RosterIdentityConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/** A check that corroborates a rename without being required of one. */
export enum RosterIdentitySignal {
  LEVEL_NOT_LOWER = 'LEVEL_NOT_LOWER',
  CONTRIBUTION_NOT_LOWER = 'CONTRIBUTION_NOT_LOWER',
  RANK_CHANGE_NOT_EARLIER = 'RANK_CHANGE_NOT_EARLIER',
}

/** Why a candidate can be seen but not decided. */
export enum RosterIdentityCollisionReason {
  SEVERAL_PARTNERS = 'SEVERAL_PARTNERS',
  OLD_HANDLE_STILL_PRESENT = 'OLD_HANDLE_STILL_PRESENT',
  NEW_HANDLE_ALREADY_PRESENT = 'NEW_HANDLE_ALREADY_PRESENT',
  HANDLE_SPLIT = 'HANDLE_SPLIT',
  HANDLE_MERGE = 'HANDLE_MERGE',
  LISTED_TOGETHER = 'LISTED_TOGETHER',
}

/** One exact Character name and handle as a roster listed it. */
export interface RosterIdentityAlias {
  aliasId: string;
  identityId: string;
  characterName: string;
  accountHandle: string;

  /** The earliest in-force export listing it, or null while none does. */
  firstObservedAt: string | null;

  /** The latest in-force export listing it, or null. */
  lastObservedAt: string | null;
}

/** A pair of names a candidate would join. */
export interface RosterIdentityLink {
  from: RosterIdentityAlias;
  to: RosterIdentityAlias;
}

/** One of the two exports a candidate rests on. */
export interface RosterIdentityEvidence {
  importId: string;

  /** When its export was taken, or null where that is not known. */
  exportedAt: string | null;
}

/** Whether one corroborating check held. */
export interface RosterIdentitySignalResult {
  signal: RosterIdentitySignal;

  /** Null where it could not be checked. */
  held: boolean | null;
}

/** A reviewer's decision, which is never changed once taken. */
export interface RosterIdentityDecision {
  action: RosterIdentityDecisionAction;
  fromState: RosterIdentityCandidateState;
  toState: RosterIdentityCandidateState;
  revision: number;
  reason: string | null;
  decidedAt: string;

  /** The reviewer's STO Info username, or null once their account is gone. */
  actorUsername: string | null;
}

/** A rename the evidence suggests. */
export interface RosterIdentityCandidate {
  id: string;
  kind: RosterIdentityCandidateKind;
  state: RosterIdentityCandidateState;

  /** Whether it may be confirmed or rejected now: open, and no collision. */
  decidable: boolean;
  confidence: RosterIdentityConfidence;
  signals: RosterIdentitySignalResult[];

  /** Why it cannot be resolved. Empty when it can. */
  collisionReasons: RosterIdentityCollisionReason[];

  /** Whether its evidence has changed since it was decided. */
  stale: boolean;

  /** The revision a decision on it must name to be accepted. */
  revision: number;

  /** The export the old name was last seen in. */
  earlier: RosterIdentityEvidence;

  /** The export the new name was first seen in. */
  later: RosterIdentityEvidence;
  links: RosterIdentityLink[];

  /** Newest first. */
  decisions: RosterIdentityDecision[];
  createdAt: string;
}

/** A page of a Fleet's candidates. */
export interface RosterIdentityCandidatePage {
  items: RosterIdentityCandidate[];
  total: number;
  page: number;
  pageSize: number;
}

/** A decision as it is sent. */
export interface DecideRosterIdentityCandidate {
  action: RosterIdentityDecisionAction;

  /** The candidate's revision as it was loaded. */
  revision: number;

  /** Optional to confirm or reject; required to undo. */
  reason?: string;
}
