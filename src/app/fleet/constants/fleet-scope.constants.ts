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
