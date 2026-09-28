/** Where a Fleet sits in an Armada (FC-024). */
export enum ArmadaPosition {
  /** The Armada's single leading Fleet. */
  ALPHA = 'ALPHA',
  /** Reports to the Alpha slot. */
  BETA = 'BETA',
  /** Sits under a Beta. */
  GAMMA = 'GAMMA',
}

/** One change to where a Fleet sits, as the history records it. */
export enum ArmadaActionKind {
  PLACED = 'PLACED',
  MOVED = 'MOVED',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
  CLOSED = 'CLOSED',
}

/** Where a request to join an Armada stands (FC-025). */
export enum ArmadaRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  LAPSED = 'LAPSED',
  CANCELLED = 'CANCELLED',
}

/**
 * A Fleet, as an Armada's pages name it. A Fleet the reader may not see keeps
 * its place without its name.
 */
export interface ArmadaFleetRef {
  readonly id: string | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly platformSegment: string;
}

/** An Armada, as a Fleet's pages name it. */
export interface ArmadaRef {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly platformSegment: string;
  /** Federation or Klingon, or null for one registered before either. */
  readonly allegiance: string | null;
}

/** One Fleet where it sits now. */
export interface ArmadaNode {
  readonly fleet: ArmadaFleetRef;
  readonly position: ArmadaPosition;
  readonly since: string;
}

/** A Beta, with the Gammas under it. */
export interface ArmadaBeta extends ArmadaNode {
  readonly gammas: readonly ArmadaNode[];
}

/** An Armada's shape now. */
export interface ArmadaStructure {
  /** The Alpha, or null while the slot stands empty. */
  readonly alpha: ArmadaNode | null;
  readonly betas: readonly ArmadaBeta[];
  readonly maxBetas: number;
  readonly maxGammasPerBeta: number;
}

/** An Armada's shape, for one reader. */
export interface ArmadaView {
  readonly structure: ArmadaStructure;
  /** Whether they may answer requests and arrange it. */
  readonly mayManage: boolean;
  /** Whether they are its member, or hold a role there. */
  readonly isMember: boolean;
  /** Open requests, for a manager. */
  readonly openRequests: number;
}

/** Where a Fleet was or went. */
export interface ArmadaPlace {
  readonly position: ArmadaPosition;
  /** The Beta, for a Gamma. */
  readonly parent: ArmadaFleetRef | null;
}

/** One Fleet a change moved. */
export interface ArmadaMove {
  readonly fleet: ArmadaFleetRef;
  readonly action: ArmadaActionKind;
  readonly from: ArmadaPlace | null;
  readonly to: ArmadaPlace | null;
}

/** One change to an Armada's shape. */
export interface ArmadaChange {
  readonly changeId: string;
  readonly at: string;
  /** Who made it, for a member; otherwise null. */
  readonly recordedBy: string | null;
  /** Why, for a member; otherwise null. */
  readonly reason: string | null;
  readonly moves: readonly ArmadaMove[];
}

/** A page of an Armada's history, newest first. */
export interface ArmadaHistoryPage {
  readonly items: readonly ArmadaChange[];
  readonly recordersShown: boolean;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

/** A request to join an Armada. */
export interface ArmadaRequest {
  readonly id: string;
  readonly status: ArmadaRequestStatus;
  readonly armada: ArmadaRef;
  readonly fleet: ArmadaFleetRef;
  readonly requestedBy: string | null;
  readonly message: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly answeredAt: string | null;
  readonly answeredBy: string | null;
  /** Why it was rejected. */
  readonly reason: string | null;
}

/** A page of an Armada's requests. */
export interface ArmadaRequestPage {
  readonly items: readonly ArmadaRequest[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

/** Where a Fleet goes. */
export interface ArmadaSlot {
  readonly position: ArmadaPosition;
  /** The Beta, for a Gamma. */
  readonly parentFleetId?: string;
}

/** What becomes of a Gamma whose Beta leaves or moves. */
export type GammaOutcome = 'BETA' | 'GAMMA' | 'LEAVE';

/** What becomes of one Gamma. */
export interface GammaResolution {
  readonly fleetId: string;
  readonly outcome: GammaOutcome;
  /** The Beta, for GAMMA. */
  readonly parentFleetId?: string;
}

/** Moves a placed Fleet. */
export interface MoveArmadaFleetRequest extends ArmadaSlot {
  readonly reason: string;
  readonly gammas?: readonly GammaResolution[];
}

/** Takes a Fleet out of an Armada. */
export interface RemoveArmadaFleetRequest {
  readonly reason: string;
  readonly gammas?: readonly GammaResolution[];
}

/** Where a Fleet sits in an Armada now. */
export interface FleetPlacement {
  readonly armada: ArmadaRef;
  readonly position: ArmadaPosition;
  readonly parent: ArmadaFleetRef | null;
  readonly since: string;
  /** How many Gammas sit under it, for a Beta. */
  readonly gammaCount: number;
}

/** A Fleet's Armada, for its page. */
export interface FleetArmadaView {
  readonly placement: FleetPlacement | null;
  /** Whether the reader may ask to join and take the Fleet out. */
  readonly mayRequest: boolean;
  readonly openRequest: ArmadaRequest | null;
  readonly lastAnswered: ArmadaRequest | null;
  /** The Armadas it could ask to join now. */
  readonly choices: readonly ArmadaRef[];
  /** Why it cannot ask, when it may not. */
  readonly cannotRequestBecause: string | null;
}

/** One of a Community's Armadas, with its shape. */
export interface CommunityArmada {
  readonly armada: ArmadaRef;
  readonly structure: ArmadaStructure;
}

/** A Community's Armadas, and its Fleets in none. */
export interface CommunityStructure {
  readonly armadas: readonly CommunityArmada[];
  readonly standaloneFleets: readonly ArmadaFleetRef[];
}
