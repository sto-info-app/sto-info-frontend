/**
 * The name a Community registration form starts with.
 *
 * FC-013's first acceptance criterion: the default is the registrant's STO
 * Info username plus "Community", and it is editable — a starting point
 * rather than a rule, so somebody who has a name in mind types over it and
 * somebody who has not is spared inventing one to get past the field.
 *
 * Possessive rather than a bare juxtaposition, because "Steve's Community"
 * is what a person would write and "Steve Community" is what a template
 * would. The apostrophe is legal in the name column, and the slug is
 * derived separately, so it costs nothing.
 *
 * A username already ending in `s` still takes `'s`, which is the modern
 * British convention for a name — Charles's, not Charles'. Guessing which
 * of the two a username wants would need to know whether it is a name at
 * all, and it may equally be `xX_ds9_Xx`.
 *
 * @param username - The registrant's STO Info username.
 * @returns The name to start the form with, or an empty string when there
 *   is no username to build one from.
 */
export function defaultCommunityName(username: string | null): string {
  const trimmed = username?.trim() ?? '';

  return trimmed === '' ? '' : `${trimmed}'s Community`;
}
