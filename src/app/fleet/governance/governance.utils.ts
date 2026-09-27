import {
  DelegableCapability,
  FleetScopeRole,
  ScopeCapabilityEffect,
  ScopeGovernanceAction,
  ScopeGovernanceActionKind,
} from 'src/app/models/fleet-governance.models';

import { UNNAMED_PERSON } from './governance.constants';

/** What each role label is called in the middle of a sentence. */
const ROLE_WITH_ARTICLE: Record<FleetScopeRole, string> = {
  [FleetScopeRole.OWNER]: 'the Owner',
  [FleetScopeRole.ADMIN]: 'an Admin',
  [FleetScopeRole.OFFICER]: 'an Officer',
  [FleetScopeRole.MEMBER]: 'a Member',
};

/**
 * Names somebody for a sentence.
 *
 * @param name - Their username, or null.
 * @returns The name, or a description of its absence.
 */
export function nameOf(name: string | null): string {
  return name ?? UNNAMED_PERSON;
}

/**
 * Says what one change in a scope's history was.
 *
 * @param entry - The change.
 * @param capabilityName - Names a capability code for a reader.
 * @returns A sentence, without its reason.
 */
export function describeGovernanceAction(
  entry: ScopeGovernanceAction,
  capabilityName: (code: string) => string,
): string {
  const actor = entry.asSiteAdmin
    ? 'A site administrator'
    : nameOf(entry.actorName);
  const subject = nameOf(entry.subjectName);
  const capability = capabilityName(entry.capability ?? '');
  const role = ROLE_WITH_ARTICLE[entry.role ?? FleetScopeRole.MEMBER];

  switch (entry.action) {
    case ScopeGovernanceActionKind.ROLE_ASSIGNED:
      return `${actor} made ${subject} ${role}.`;
    case ScopeGovernanceActionKind.ROLE_WITHDRAWN:
      return `${actor} withdrew ${subject}’s role as ${role}.`;
    case ScopeGovernanceActionKind.CAPABILITY_GRANTED:
      return entry.subjectName === null && entry.role !== null
        ? `${actor} gave every Officer “${capability}”.`
        : `${actor} granted “${capability}” to ${subject}.`;
    case ScopeGovernanceActionKind.CAPABILITY_DENIED:
      return `${actor} denied “${capability}” to ${subject}.`;
    case ScopeGovernanceActionKind.CAPABILITY_CLEARED:
      if (entry.subjectName === null && entry.role !== null) {
        return `${actor} took “${capability}” from every Officer.`;
      }

      return entry.clearedEffect === ScopeCapabilityEffect.DENY
        ? `${actor} lifted the denial of “${capability}” to ${subject}.`
        : `${actor} took “${capability}” from ${subject}.`;
    case ScopeGovernanceActionKind.OWNERSHIP_OFFERED:
      return `${actor} offered ownership to ${subject}.`;
    case ScopeGovernanceActionKind.OWNERSHIP_ACCEPTED:
      return `${actor} accepted ownership from ${subject}.`;
    case ScopeGovernanceActionKind.OWNERSHIP_DECLINED:
      return `${actor} declined the offer of ownership.`;
    case ScopeGovernanceActionKind.OWNERSHIP_CANCELLED:
      return `${actor} cancelled the offer of ownership to ${subject}.`;
    case ScopeGovernanceActionKind.OWNERSHIP_REASSIGNED:
      return `${actor} made ${subject} the Owner.`;
    case ScopeGovernanceActionKind.CLOSED:
      return `${actor} closed it.`;
  }
}

/**
 * Names capability codes for a reader, from those delegable at a scope.
 *
 * @param delegable - The capabilities the scope offers, with their names.
 * @returns A function naming a code, or giving the code back when the scope
 *   no longer offers it.
 */
export function capabilityNamer(
  delegable: readonly DelegableCapability[],
): (code: string) => string {
  const names = new Map(delegable.map(entry => [entry.code, entry.name]));

  return code => names.get(code) ?? code;
}
