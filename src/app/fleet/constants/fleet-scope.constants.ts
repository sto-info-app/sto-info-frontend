/**
 * The three things a Fleet page can be about, and how each is named and drawn.
 *
 * A Community holds Fleets, and an Armada holds Fleets from more than one
 * Community, so a directory listing shows all three side by side and a reader
 * has to be able to tell at a glance which one they are looking at.
 *
 * That distinction is carried by a label and an icon rather than by a colour.
 * The whole Fleet system is sky, the way Custom Tracking is tangerine and the
 * help section is perano, so colour says which feature you are in; three
 * colours for three scope types would spend the feature's identity on a
 * difference the label already states, and would leave nothing to say with when
 * a Fleet is recruiting, closed or disputed. It also keeps the distinction
 * legible to a reader who cannot separate two mid-tone blues.
 */

/** A registered Community, which holds Fleets. */
export const FLEET_SCOPE_COMMUNITY = 'COMMUNITY';

/** A single Fleet on one platform. */
export const FLEET_SCOPE_FLEET = 'FLEET';

/** An Armada, which holds Fleets from one or more Communities. */
export const FLEET_SCOPE_ARMADA = 'ARMADA';

/** Which level of the Fleet hierarchy something sits at. */
export type FleetScopeType =
  | typeof FLEET_SCOPE_COMMUNITY
  | typeof FLEET_SCOPE_FLEET
  | typeof FLEET_SCOPE_ARMADA;

/** How each scope is written, in the words the rest of the site uses. */
export const FLEET_SCOPE_LABELS: Readonly<Record<FleetScopeType, string>> = {
  [FLEET_SCOPE_COMMUNITY]: 'Community',
  [FLEET_SCOPE_FLEET]: 'Fleet',
  [FLEET_SCOPE_ARMADA]: 'Armada',
};

/**
 * The icon drawn beside each label.
 *
 * All three are already used elsewhere in the application, which is the only
 * way to know a glyph is in the subsetted Font Awesome kit: one that is not
 * renders as nothing at all, silently.
 */
export const FLEET_SCOPE_ICONS: Readonly<Record<FleetScopeType, string>> = {
  [FLEET_SCOPE_COMMUNITY]: 'fa-solid fa-people-group',
  [FLEET_SCOPE_FLEET]: 'fa-solid fa-rocket-launch',
  [FLEET_SCOPE_ARMADA]: 'fa-solid fa-layer-group',
};

/**
 * How each visibility setting is worded on a scope's page.
 *
 * Written as who can see it rather than as the value's name, because
 * "FLEET_MEMBERS" is a column and "Approved Fleet members" is an answer.
 */
export const FLEET_AUDIENCE_LABELS: Readonly<Record<string, string>> = {
  PUBLIC: 'Anyone, including signed-out visitors',
  COMMUNITY: 'Subscribers and members of the Community',
  FLEET_MEMBERS: 'Approved members of the Fleet',
  PRIVATE: 'The owner alone',
};

/**
 * How each recruitment posture is offered on a form.
 *
 * Worded as the choice being made rather than as the state it produces. A
 * card's pill says "Applications open", which is what a reader wants to
 * know; a form asks "how should people join", and "By application" is the
 * answer to that question.
 */
export const FLEET_RECRUITMENT_CHOICES: Readonly<Record<string, string>> = {
  OPEN: 'Anyone eligible may join',
  APPLICATION: 'By application',
  INVITE_ONLY: 'By invitation only',
  CLOSED: 'Not recruiting',
};

/**
 * How each visibility setting is offered on a form.
 *
 * Shorter than the labels a page reads back, because a select option is
 * read while choosing rather than while learning what was chosen.
 */
export const FLEET_AUDIENCE_CHOICES: Readonly<Record<string, string>> = {
  PUBLIC: 'Anyone',
  COMMUNITY: 'Community members',
  FLEET_MEMBERS: 'Fleet members',
  PRIVATE: 'Only me',
};

/**
 * What a page says about the caller's own standing at a scope.
 *
 * Only the states worth a sentence have one. Following says itself through
 * the control beside it, and somebody with no relationship is told nothing
 * rather than told they are nobody. `{scope}` is replaced with what the page
 * is about, because "a member of this Fleet" and "a member of this
 * Community" are different claims and only one of them is true.
 */
export const FLEET_RELATIONSHIP_NOTES: Readonly<Record<string, string | null>> =
  {
    NONE: null,
    FOLLOWER: null,
    REQUESTED: 'Your request to join this {scope} is waiting for an answer.',
    MEMBER: 'You are an approved member of this {scope}.',
    SUSPENDED: 'Your membership of this {scope} is suspended.',
  };
