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
  owner: GovernancePerson;
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
  owner: GovernancePerson;
  admins: GovernancePerson[];
  offer: OwnershipTransfer | null;
}
