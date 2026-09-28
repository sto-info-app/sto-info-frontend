import {
  ARMADA_POSITION_LABELS,
  HIDDEN_FLEET,
} from 'src/app/fleet/armadas/armada.constants';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  ArmadaActionKind,
  ArmadaFleetRef,
  ArmadaMove,
  ArmadaPlace,
  ArmadaStructure,
} from 'src/app/models/fleet-armada.models';

/** Names Fleets for one list, telling apart any that share a name. */
export type FleetNamer = (fleet: ArmadaFleetRef) => string;

/**
 * Builds a namer for the Fleets in view.
 *
 * Two Fleets in one list with the same exact name get their Community's
 * name after it, as Steve chose on 28 September 2026. One Fleet named more
 * than once, as in a history, is still one Fleet. A Fleet the reader may not
 * see is named as such.
 *
 * @param fleets - Every Fleet the list shows.
 * @param communityName - The Community holding them.
 * @returns The namer.
 */
export function fleetNamer(
  fleets: readonly ArmadaFleetRef[],
  communityName: string,
): FleetNamer {
  const holders = new Map<string, Set<string>>();

  for (const fleet of fleets) {
    if (fleet.name !== null) {
      const ids = holders.get(fleet.name) ?? new Set<string>();

      ids.add(fleet.id as string);
      holders.set(fleet.name, ids);
    }
  }

  return fleet => {
    if (fleet.name === null) {
      return HIDDEN_FLEET;
    }

    return (holders.get(fleet.name) as Set<string>).size > 1
      ? `${fleet.name} (${communityName})`
      : fleet.name;
  };
}

/**
 * Every Fleet an Armada's shape shows.
 *
 * @param structure - The shape.
 * @returns The Fleets, Alpha first.
 */
export function fleetsIn(structure: ArmadaStructure): ArmadaFleetRef[] {
  return [
    ...(structure.alpha === null ? [] : [structure.alpha.fleet]),
    ...structure.betas.flatMap(beta => [
      beta.fleet,
      ...beta.gammas.map(gamma => gamma.fleet),
    ]),
  ];
}

/**
 * A Fleet's page, where the reader may see it.
 *
 * @param fleet - The Fleet.
 * @param communitySlug - The Community holding it.
 * @returns The router link, or null for a hidden Fleet.
 */
export function fleetLinkOf(
  fleet: ArmadaFleetRef,
  communitySlug: string,
): string[] | null {
  return fleet.slug === null
    ? null
    : FLEET_LINKS.fleet(communitySlug, fleet.platformSegment, fleet.slug);
}

/**
 * Puts a place as words.
 *
 * @param place - Where.
 * @param nameOf - Names Fleets.
 * @returns "Alpha", "Beta" or "Gamma under …".
 */
export function placeText(place: ArmadaPlace, nameOf: FleetNamer): string {
  const label = ARMADA_POSITION_LABELS[place.position];

  return place.parent === null
    ? label
    : `${label} under ${nameOf(place.parent)}`;
}

/**
 * Puts one Fleet's part in a change as a sentence.
 *
 * @param move - What happened to it.
 * @param nameOf - Names Fleets.
 * @returns The sentence.
 */
export function describeMove(move: ArmadaMove, nameOf: FleetNamer): string {
  const fleet = nameOf(move.fleet);
  const from = move.from === null ? '' : placeText(move.from, nameOf);
  const to = move.to === null ? '' : placeText(move.to, nameOf);

  switch (move.action) {
    case ArmadaActionKind.PLACED:
      return `${fleet} joined as ${to}.`;
    case ArmadaActionKind.MOVED:
      return `${fleet} moved from ${from} to ${to}.`;
    case ArmadaActionKind.LEFT:
      return `${fleet} left; it was ${from}.`;
    case ArmadaActionKind.REMOVED:
      return `${fleet} was taken out; it was ${from}.`;
    case ArmadaActionKind.CLOSED:
      return `${fleet} came out on closure; it was ${from}.`;
  }
}
