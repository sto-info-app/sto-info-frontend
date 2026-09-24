import {
  RosterIdentityCandidateKind,
  RosterIdentityCandidateState,
  RosterIdentityCollisionReason,
  RosterIdentityConfidence,
  RosterIdentityDecisionAction,
  RosterIdentitySignal,
} from 'src/app/models/fleet-identity.models';

/**
 * What the server's rename codes mean, in words.
 *
 * A reviewer is deciding whether two names are one person, and the codes say
 * why the site thinks they might be or why it cannot tell. Each is written out
 * as the thing it checked, so a reviewer can weigh it rather than trust it.
 */

/** Each kind of rename, as a heading. */
export const ROSTER_IDENTITY_KIND_LABELS: Record<
  RosterIdentityCandidateKind,
  string
> = {
  [RosterIdentityCandidateKind.CHARACTER_RENAME]: 'Character rename',
  [RosterIdentityCandidateKind.ACCOUNT_RENAME]: 'Account rename',
};

/** Where a candidate has been left. */
export const ROSTER_IDENTITY_STATE_LABELS: Record<
  RosterIdentityCandidateState,
  string
> = {
  [RosterIdentityCandidateState.OPEN]: 'Open',
  [RosterIdentityCandidateState.CONFIRMED]: 'Confirmed',
  [RosterIdentityCandidateState.REJECTED]: 'Rejected',
};

/** How sure the checks that are not required make the site. */
export const ROSTER_IDENTITY_CONFIDENCE_LABELS: Record<
  RosterIdentityConfidence,
  string
> = {
  [RosterIdentityConfidence.HIGH]: 'High confidence',
  [RosterIdentityConfidence.MEDIUM]: 'Medium confidence',
  [RosterIdentityConfidence.LOW]: 'Low confidence',
};

/** Each corroborating check, as the thing it asks. */
export const ROSTER_IDENTITY_SIGNAL_LABELS: Record<
  RosterIdentitySignal,
  string
> = {
  [RosterIdentitySignal.LEVEL_NOT_LOWER]: 'Level did not go down',
  [RosterIdentitySignal.CONTRIBUTION_NOT_LOWER]:
    'Contribution total did not go down',
  [RosterIdentitySignal.RANK_CHANGE_NOT_EARLIER]:
    'Rank change date did not go back',
};

/** Why a candidate can be read and not decided. */
export const ROSTER_IDENTITY_COLLISION_LABELS: Record<
  RosterIdentityCollisionReason,
  string
> = {
  [RosterIdentityCollisionReason.SEVERAL_PARTNERS]:
    'A name here could be paired with more than one on the other side.',
  [RosterIdentityCollisionReason.OLD_HANDLE_STILL_PRESENT]:
    'The old handle is still on the later roster, and a handle belongs to ' +
    'the whole account.',
  [RosterIdentityCollisionReason.NEW_HANDLE_ALREADY_PRESENT]:
    'The new handle was already on the earlier roster.',
  [RosterIdentityCollisionReason.HANDLE_SPLIT]:
    'One handle’s Characters moved to more than one new handle.',
  [RosterIdentityCollisionReason.HANDLE_MERGE]:
    'More than one handle’s Characters moved to the same new handle.',
  [RosterIdentityCollisionReason.LISTED_TOGETHER]:
    'A partial roster between the two listed both names at once.',
};

/** What a reviewer did, in the past tense for the history. */
export const ROSTER_IDENTITY_ACTION_LABELS: Record<
  RosterIdentityDecisionAction,
  string
> = {
  [RosterIdentityDecisionAction.CONFIRM]: 'Confirmed',
  [RosterIdentityDecisionAction.REJECT]: 'Rejected',
  [RosterIdentityDecisionAction.UNDO]: 'Undone',
};
