/**
 * Every permission code the frontend may ask about.
 *
 * Mirrors the backend's permission registry. Declared as literals so a typo in
 * a template or guard is a compile error rather than a permission that is
 * never held, which would silently hide a control from everyone.
 */
export const PERMISSIONS = {
  STORYTIME_VIEW: 'storytime.view',
  STORYTIME_STORY_CREATE: 'storytime.story.create',
  STORYTIME_STORY_EDIT_OWN: 'storytime.story.edit.own',
  STORYTIME_STORY_PUBLISH_OWN: 'storytime.story.publish.own',
  STORYTIME_COLLABORATE: 'storytime.collaborate',
  STORYTIME_ARC_CREATE: 'storytime.arc.create',
  STORYTIME_ARC_MANAGE_OWN: 'storytime.arc.manage.own',
  STORYTIME_COMMENT_CREATE: 'storytime.comment.create',
  STORYTIME_REACTION_CREATE: 'storytime.reaction.create',
  STORYTIME_REPORT_CREATE: 'storytime.report.create',
  STORYTIME_MODERATE: 'storytime.moderate',
  STORYTIME_SPOTLIGHT_MANAGE: 'storytime.spotlight.manage',
  STORYTIME_TAG_MANAGE: 'storytime.tag.manage',
  STORYTIME_CONFIGURE: 'storytime.configure',
} as const;

/**
 * A permission code the frontend may ask about.
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * The permissions the signed-in user currently holds.
 */
export interface MyPermissions {
  /** Permission codes held by the caller, alphabetically ordered. */
  permissions: string[];
}

/**
 * Whether a per-user override adds a permission or takes one away.
 *
 * Mirrors the API's `PermissionEffect`. A DENY always beats a GRANT, and both
 * beat whatever the user's role confers, which is what lets one account be
 * treated differently from everyone else holding that role.
 */
export enum PermissionEffect {
  /** Adds a permission the user's role does not confer. */
  GRANT = 'GRANT',
  /** Withholds a permission the user's role would otherwise confer. */
  DENY = 'DENY',
}

/**
 * A permission as the administration screens present it.
 *
 * Unlike {@link PERMISSIONS}, this is whatever the server currently recognises
 * rather than a compile-time list, so a permission added by a migration shows
 * up without a frontend release.
 */
export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** The application area the permission belongs to, e.g. `STORYTIME`. */
  module: string;
}

/**
 * An override currently in force against one user.
 */
export interface UserPermissionOverride {
  id: string;
  permissionCode: string;
  effect: PermissionEffect;
  reason: string;
  grantedByUserId: string;
  /** When the override lapses. Null means indefinite. */
  expiresAt: string | null;
  createdAt: string;
}

/**
 * What a user may currently do, and which overrides explain it.
 */
export interface UserAccessSummary {
  userId: string;
  /** The role the member holds, which decides their baseline permissions. */
  role: string;
  /** Every permission code held once overrides are applied. */
  effectivePermissions: string[];
  overrides: UserPermissionOverride[];
}

/**
 * The roles an administrator may give a member.
 *
 * ADMIN is deliberately absent, and is not an oversight: site-wide
 * administration is granted outside the application, so there is no control
 * here that hands it out. The API refuses the value independently.
 */
export const ASSIGNABLE_ROLES = {
  USER: 'USER',
  STORYTIME_CURATOR: 'STORYTIME_CURATOR',
} as const;

/**
 * A role an administrator may give a member.
 */
export type AssignableRole =
  (typeof ASSIGNABLE_ROLES)[keyof typeof ASSIGNABLE_ROLES];

/**
 * What each assignable role means, for the role picker.
 */
export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, string> = {
  [ASSIGNABLE_ROLES.USER]: 'Member',
  [ASSIGNABLE_ROLES.STORYTIME_CURATOR]: 'Storytime Curator',
};

/**
 * What each assignable role lets a member do, shown beside the picker so the
 * choice is made on what changes rather than on the name of the role.
 */
export const ASSIGNABLE_ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  [ASSIGNABLE_ROLES.USER]:
    'Reads, writes and publishes their own Storytime content.',
  [ASSIGNABLE_ROLES.STORYTIME_CURATOR]:
    'Everything a member may do, plus running Storytime: the moderation queue, the Spotlight and the tag vocabulary. Storytime’s settings stay with administrators.',
};

/**
 * The role of a member whose role this screen cannot change.
 *
 * Administrators are managed outside the application, so the picker reads
 * their role but never offers to set it.
 */
export const ADMIN_ROLE = 'ADMIN';

/**
 * Payload for giving a member a role.
 */
export interface SetUserRoleRequest {
  role: AssignableRole;
}

/**
 * Payload for granting or withholding a single permission.
 */
export interface SetPermissionOverrideRequest {
  permissionCode: string;
  effect: PermissionEffect;
  /** Why the override was applied. Recorded so the decision stays reviewable. */
  reason: string;
  /** ISO timestamp at which the override lapses. Omit for indefinite. */
  expiresAt?: string;
}

export const PERMISSION_EFFECT_LABELS: Record<PermissionEffect, string> = {
  [PermissionEffect.GRANT]: 'Grant',
  [PermissionEffect.DENY]: 'Deny',
};
