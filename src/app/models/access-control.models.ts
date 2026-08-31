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
