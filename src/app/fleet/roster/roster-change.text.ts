import {
  RosterChange,
  RosterChangeKind,
  RosterRankMove,
} from 'src/app/models/fleet-roster.models';

/** Each kind of change, as the History tab's filter names it. */
export const ROSTER_CHANGE_KIND_LABELS: Readonly<
  Record<RosterChangeKind, string>
> = {
  [RosterChangeKind.JOINED]: 'Joined',
  [RosterChangeKind.REJOINED]: 'Rejoined',
  [RosterChangeKind.LEFT]: 'Left',
  [RosterChangeKind.RENAMED]: 'Renamed',
  [RosterChangeKind.RANK_CHANGED]: 'Rank changes',
  [RosterChangeKind.JOIN_DATE_CHANGED]: 'Join Date changes',
  [RosterChangeKind.CONTRIBUTION_CHANGED]: 'Contribution rises',
  [RosterChangeKind.CONTRIBUTION_RESET]: 'Contribution resets',
};

/**
 * Says what a change was, without its dates (FC-020).
 *
 * The dates are the two exports it lies between, which the page says beside
 * it: a change is never "on" a day. A rank change is called a promotion or a
 * demotion only where the Fleet's rank order puts the two labels in
 * different tiers, and is otherwise only a change of rank (plan section
 * 3.7). A fall in contribution is a reset, never a negative gift.
 *
 * @param change - The change.
 * @param whole - Writes a decimal string out with its thousands separated.
 * @param day - Writes an instant as the reader's date.
 * @returns What it was, as a phrase following the member's name.
 */
export function describeRosterChange(
  change: RosterChange,
  whole: (value: string) => string,
  day: (instant: string) => string,
): string {
  switch (change.kind) {
    case RosterChangeKind.JOINED:
      return 'joined';
    case RosterChangeKind.REJOINED:
      return 'rejoined';
    case RosterChangeKind.LEFT:
      return 'left';
    case RosterChangeKind.RENAMED:
      return (
        `was renamed from ${change.fromCharacterName}` +
        `${change.fromAccountHandle} to ${change.toCharacterName}` +
        `${change.toAccountHandle}`
      );
    case RosterChangeKind.RANK_CHANGED:
      return `${rankVerb(change.rankMove)} from ${change.fromRank} to ${change.toRank}`;
    case RosterChangeKind.JOIN_DATE_CHANGED:
      return (
        `had their Join Date change from ${day(change.fromJoinedAt as string)} ` +
        `to ${day(change.toJoinedAt as string)}`
      );
    case RosterChangeKind.CONTRIBUTION_CHANGED:
      return (
        `contributed ${whole(change.contributionDelta as string)} ` +
        `(${whole(change.fromContribution as string)} to ` +
        `${whole(change.toContribution as string)})`
      );
    case RosterChangeKind.CONTRIBUTION_RESET:
      return (
        `had their contribution total reset ` +
        `(${whole(change.fromContribution as string)} to ` +
        `${whole(change.toContribution as string)})`
      );
  }
}

/**
 * The verb for a rank change.
 *
 * @param move - What the tiers make of it, or null for nothing.
 * @returns The verb.
 */
function rankVerb(move: RosterRankMove | null): string {
  switch (move) {
    case RosterRankMove.PROMOTED:
      return 'was promoted';
    case RosterRankMove.DEMOTED:
      return 'was demoted';
    default:
      return 'changed rank';
  }
}
