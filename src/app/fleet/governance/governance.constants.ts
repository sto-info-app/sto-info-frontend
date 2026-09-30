import {
  FleetScopeRole,
  ScopeCapabilityEffect,
} from 'src/app/models/fleet-governance.models';

/** Changing roles and delegations: the Owner's, and not delegable. */
export const SCOPE_ROLES_MANAGE_CAPABILITY = 'scope.roles.manage';

/** Offering ownership: the Owner's, and not delegable. */
export const SCOPE_OWNERSHIP_TRANSFER_CAPABILITY = 'scope.ownership.transfer';

/** Closing: the Owner's, and not delegable. */
export const SCOPE_CLOSE_CAPABILITY = 'scope.close';

/**
 * Changing a Community's or Fleet's own settings — its name, web address and
 * who can see it: the Owner's, and not delegable.
 */
export const SCOPE_SETTINGS_MANAGE_CAPABILITY = 'scope.settings.manage';

/** Who may read who governs a scope. */
export const GOVERNANCE_READER_ROLES: readonly string[] = [
  FleetScopeRole.OWNER,
  FleetScopeRole.ADMIN,
];

/** The longest reason the server keeps. */
export const GOVERNANCE_REASON_LIMIT = 500;

/** What each role label is called. */
export const ROLE_LABELS: Record<FleetScopeRole, string> = {
  [FleetScopeRole.OWNER]: 'Owner',
  [FleetScopeRole.ADMIN]: 'Admin',
  [FleetScopeRole.OFFICER]: 'Officer',
  [FleetScopeRole.MEMBER]: 'Member',
};

/** What a grant and a denial are called. */
export const EFFECT_LABELS: Record<ScopeCapabilityEffect, string> = {
  [ScopeCapabilityEffect.GRANT]: 'Granted',
  [ScopeCapabilityEffect.DENY]: 'Denied',
};

/** Who is named when their account has no username or has gone. */
export const UNNAMED_PERSON = 'An account with no username';
