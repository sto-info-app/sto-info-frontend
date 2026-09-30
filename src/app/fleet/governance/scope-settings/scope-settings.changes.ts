import {
  FleetAudience,
  FleetCommunity,
  FleetRecruitmentState,
  StoFleet,
  UpdateFleetCommunity,
  UpdateStoFleet,
} from 'src/app/models/fleet.models';

/**
 * What the settings form holds.
 *
 * One shape for both kinds of scope. A Community has no allegiance and a
 * Fleet no description, recruitment state or timezone here, and each simply
 * leaves the other's fields as they were read.
 */
export interface ScopeSettingsValues {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly recruitmentState: FleetRecruitmentState;
  readonly visibility: FleetAudience;
  readonly preferredTimezone: string;
  /** Empty for "Not stated". */
  readonly allegianceFactionId: string;
}

/**
 * The form's starting values: the Community as it stands.
 *
 * @param community - The Community as read.
 * @returns The values.
 */
export function communityValuesOf(
  community: FleetCommunity,
): ScopeSettingsValues {
  return {
    name: community.name,
    slug: community.slug,
    description: community.description ?? '',
    recruitmentState: community.recruitmentState,
    visibility: community.visibility,
    preferredTimezone: community.preferredTimezone,
    allegianceFactionId: '',
  };
}

/**
 * The form's starting values: the Fleet as it stands.
 *
 * @param fleet - The Fleet as read.
 * @returns The values.
 */
export function fleetValuesOf(fleet: StoFleet): ScopeSettingsValues {
  return {
    name: fleet.exactGameName,
    slug: fleet.slug,
    description: '',
    recruitmentState: fleet.recruitmentState,
    visibility: fleet.visibility,
    preferredTimezone: '',
    allegianceFactionId: fleet.allegianceFactionId ?? '',
  };
}

/**
 * What changed on a Community's form, and nothing else.
 *
 * Only what changed is sent, so a save cannot put back a field somebody else
 * changed meanwhile that this form never touched. The name and description
 * are trimmed, as on registration: a Community's name is the Owner's own and
 * not an in-game one (ADR-0003 does not apply to it).
 *
 * A web address left as it was is not sent, even on a rename, because the
 * server makes a new one from the new name — which is what renaming is for.
 * An emptied one is not sent either: it means "make one from the name".
 *
 * @param community - The Community as read.
 * @param values - The form.
 * @returns The changes, empty when there are none.
 */
export function communityChangesOf(
  community: FleetCommunity,
  values: ScopeSettingsValues,
): UpdateFleetCommunity {
  const name = values.name.trim();
  const description = values.description.trim();

  return {
    ...(name === community.name ? {} : { name }),
    ...slugChangeOf(community.slug, values.slug),
    ...(description === (community.description ?? '')
      ? {}
      : { description: description === '' ? null : description }),
    ...(values.recruitmentState === community.recruitmentState
      ? {}
      : { recruitmentState: values.recruitmentState }),
    ...(values.visibility === community.visibility
      ? {}
      : { visibility: values.visibility }),
    ...(values.preferredTimezone === community.preferredTimezone
      ? {}
      : { preferredTimezone: values.preferredTimezone }),
  };
}

/**
 * What changed on a Fleet's form, and nothing else.
 *
 * **The name is compared and sent exactly as typed.** An edge space is part
 * of an in-game name and may be the only thing telling two Fleets apart, so
 * adding or removing one is a rename like any other (ADR-0003).
 *
 * @param fleet - The Fleet as read.
 * @param values - The form.
 * @returns The changes, empty when there are none.
 */
export function fleetChangesOf(
  fleet: StoFleet,
  values: ScopeSettingsValues,
): UpdateStoFleet {
  const allegiance =
    values.allegianceFactionId === '' ? null : values.allegianceFactionId;

  return {
    ...(values.name === fleet.exactGameName
      ? {}
      : { exactGameName: values.name }),
    ...slugChangeOf(fleet.slug, values.slug),
    ...(allegiance === fleet.allegianceFactionId
      ? {}
      : { allegianceFactionId: allegiance }),
    ...(values.visibility === fleet.visibility
      ? {}
      : { visibility: values.visibility }),
  };
}

/**
 * Whether a set of changes has anything in it.
 *
 * @param changes - The changes.
 * @returns True when at least one field changed.
 */
export function hasChanges(
  changes: UpdateFleetCommunity | UpdateStoFleet,
): boolean {
  return Object.keys(changes).length > 0;
}

/**
 * The web address to ask for, where one was typed that differs.
 *
 * @param current - The slug as read.
 * @param typed - What is in the field.
 * @returns The slug to send, or nothing.
 */
function slugChangeOf(current: string, typed: string): { slug?: string } {
  const slug = typed.trim();

  return slug === '' || slug === current ? {} : { slug };
}
