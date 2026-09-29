/**
 * Who governs a Community or Fleet: roles, delegation, ownership and closure
 * (FC-022). Mirrors the server's `fleet/governance` DTOs.
 */

/** A fixed role label, as the server names it. */
export enum FleetScopeRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
}

/** The role labels an Owner gives. Owner itself moves only by transfer. */
export type AppointableRole = FleetScopeRole.ADMIN | FleetScopeRole.OFFICER;

/** Whether a capability is given or taken away. */
export enum ScopeCapabilityEffect {
  GRANT = 'GRANT',
  DENY = 'DENY',
}

/** What a logged governance change was. */
export enum ScopeGovernanceActionKind {
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_WITHDRAWN = 'ROLE_WITHDRAWN',
  CAPABILITY_GRANTED = 'CAPABILITY_GRANTED',
  CAPABILITY_DENIED = 'CAPABILITY_DENIED',
  CAPABILITY_CLEARED = 'CAPABILITY_CLEARED',
  OWNERSHIP_OFFERED = 'OWNERSHIP_OFFERED',
  OWNERSHIP_ACCEPTED = 'OWNERSHIP_ACCEPTED',
  OWNERSHIP_DECLINED = 'OWNERSHIP_DECLINED',
  OWNERSHIP_CANCELLED = 'OWNERSHIP_CANCELLED',
  OWNERSHIP_REASSIGNED = 'OWNERSHIP_REASSIGNED',
  CLOSED = 'CLOSED',
  /** A site administrator suspended it (FC-036). */
  SUSPENDED = 'SUSPENDED',
  /** A site administrator lifted its suspension (FC-036). */
  REINSTATED = 'REINSTATED',
}

/** Where an offer of ownership stands, the clock included. */
export enum OwnershipTransferState {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/** Somebody named on the Manage pages. */
export interface GovernancePerson {
  userId: string;
  username: string | null;
}

/** A role somebody holds here. */
export interface ScopeRoleHolder extends GovernancePerson {
  assignmentId: string;
  role: AppointableRole;
  since: string;
}

/** A capability given to or taken from one person here. */
export interface PersonalCapability extends GovernancePerson {
  grantId: string;
  capability: string;
  effect: ScopeCapabilityEffect;
  since: string;
}

/** A capability the Owner may delegate here. */
export interface DelegableCapability {
  code: string;
  name: string;
  description: string;
}

/** Who governs a scope. */
export interface ScopeRoles {
  /** Null for a closed Community whose Owner's account was erased (FC-038). */
  owner: GovernancePerson | null;
  /** Whether the reader may change any of it: the Owner. */
  mayManage: boolean;
  holders: ScopeRoleHolder[];
  /** Whom the Owner may appoint. Empty for an Admin. */
  candidates: GovernancePerson[];
  officerCapabilities: string[];
  personal: PersonalCapability[];
  delegable: DelegableCapability[];
}

/** Gives somebody a role. */
export interface AssignScopeRoleRequest {
  userId: string;
  role: AppointableRole;
  reason?: string;
}

/** Grants or denies one capability to one person. */
export interface SetPersonalCapabilityRequest {
  userId: string;
  capability: string;
  effect: ScopeCapabilityEffect;
  reason?: string;
}

/** One entry in a scope's governance history. */
export interface ScopeGovernanceAction {
  id: string;
  action: ScopeGovernanceActionKind;
  actorName: string | null;
  asSiteAdmin: boolean;
  subjectName: string | null;
  role: FleetScopeRole | null;
  capability: string | null;
  clearedEffect: ScopeCapabilityEffect | null;
  reason: string | null;
  /**
   * Whether nobody did it: a role or grant that ended because of something
   * else, such as its holder leaving or the scope closing (FC-039).
   */
  automatic: boolean;
  createdAt: string;
}

/** An offer of a Community's ownership. */
export interface OwnershipTransfer {
  id: string;
  from: GovernancePerson;
  to: GovernancePerson;
  state: OwnershipTransferState;
  offeredAt: string;
  expiresAt: string;
  answeredAt: string | null;
}

/** Where ownership stands, for the Owner or the Admin offered it. */
export interface OwnershipStanding {
  offer: OwnershipTransfer | null;
  /** The Admins the Owner may offer it to. Empty for anybody else. */
  eligible: GovernancePerson[];
}

/** A Community, as a site administrator sees it for a dispute. */
export interface CommunityDisputeView {
  communityId: string;
  name: string;
  status: string;
  /** Null for a closed Community whose Owner's account was erased (FC-038). */
  owner: GovernancePerson | null;
  admins: GovernancePerson[];
  offer: OwnershipTransfer | null;
  /** Its Fleets, then its Armadas, each with its duplicates (FC-036). */
  scopes: DisputeScope[];
}

/**
 * One registration of an in-game name on STO Info, as a site administrator
 * sees it in a dispute (FC-036): where it came from, never who leads it.
 */
export interface DisputeRegistration {
  readonly kind: 'FLEET' | 'ARMADA';
  readonly id: string;
  readonly exactGameName: string;
  readonly platformName: string;
  /** Null for a Fleet observed but never registered. */
  readonly communityId: string | null;
  readonly communityName: string | null;
  readonly communityOwner: GovernancePerson | null;
  readonly visibility: string | null;
  readonly status: string;
  readonly registeredAt: string;
  /** A Fleet's last roster import. */
  readonly lastImportAt: string | null;
  /** A Fleet's approved members. */
  readonly memberCount: number | null;
}

/** A Fleet or Armada of the disputed Community, with every other registration of its name. */
export interface DisputeScope extends DisputeRegistration {
  readonly duplicates: DisputeRegistration[];
}

/** A site administrator's look into a Fleet's imports (FC-036). */
export interface FleetInvestigation {
  readonly id: string;
  readonly communityId: string;
  readonly communityName: string | null;
  readonly communitySlug: string | null;
  readonly fleetId: string;
  readonly fleetName: string;
  readonly fleetSlug: string;
  readonly platformName: string;
  readonly platformSegment: string;
  readonly admin: GovernancePerson | null;
  readonly purpose: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly active: boolean;
}

/** A page of site administrators' looks into Fleets. */
export interface FleetInvestigationPage {
  readonly items: FleetInvestigation[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
