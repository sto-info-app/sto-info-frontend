import { ModeratedUser } from '../../models/moderation.models';

/**
 * The modifier each account role is rendered with, so a list that mixes
 * ordinary members and administrators can be told apart at a glance rather than
 * by reading every row.
 *
 * Anything the server sends that is not in this map falls back to
 * `DEFAULT_ROLE_MODIFIER`, so a role added to the API later renders in neutral
 * grey instead of borrowing the administrator's colour.
 */
const ROLE_MODIFIERS: Record<string, string> = {
  ADMIN: 'admin',
  USER: 'user',
  STORYTIME_CURATOR: 'storytime-curator',
};

const DEFAULT_ROLE_MODIFIER = 'other';

/**
 * A member's role in the one shape the colour map and the label are both
 * derived from, so an account the API sends without a role still renders as
 * something rather than blowing up the list.
 *
 * @param member - The member.
 * @returns The upper-cased role, or `UNKNOWN`.
 */
function normalisedRole(member: ModeratedUser): string {
  return member.role ? member.role.toUpperCase() : 'UNKNOWN';
}

/**
 * How a member is named on screen: their username, falling back to the email
 * address every account has.
 *
 * @param member - The member.
 * @returns The display name.
 */
export function memberDisplayName(member: ModeratedUser): string {
  return member.username ?? member.email;
}

/**
 * Whether a member's name on screen is really their email address, which
 * happens for accounts that never chose a username.
 *
 * An STO Info username is not private and is shown as it is, but the address
 * standing in for a missing one still is, so callers blur the heading in that
 * case alone.
 *
 * @param member - The member.
 * @returns True when the display name is the email address.
 */
export function isMemberNamedByEmail(member: ModeratedUser): boolean {
  return !member.username;
}

/**
 * The class modifier for a member's role, used to colour their card.
 *
 * @param member - The member.
 * @returns The modifier, e.g. `admin`.
 */
export function memberRoleModifier(member: ModeratedUser): string {
  return ROLE_MODIFIERS[normalisedRole(member)] ?? DEFAULT_ROLE_MODIFIER;
}

/**
 * How a member's role reads on screen: the API's value with its underscores
 * spelled as spaces, since it is upper-cased anyway.
 *
 * @param member - The member.
 * @returns The role label.
 */
export function memberRoleLabel(member: ModeratedUser): string {
  return normalisedRole(member).replace(/_/g, ' ');
}
