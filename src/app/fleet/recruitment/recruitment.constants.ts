import {
  ApplicationQuestionKind,
  FleetApplicationActionKind,
  FleetApplicationRoute,
  FleetApplicationStatus,
  FleetInvitationState,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';

/** The capability that lets somebody read a Fleet's applications. */
export const APPLICATIONS_VIEW_CAPABILITY = 'applications.view';

/** The capability that lets somebody decide applications and invite. */
export const APPLICATIONS_DECIDE_CAPABILITY = 'applications.decide';

/** The capability that lets somebody change how a Fleet recruits. */
export const RECRUITMENT_MANAGE_CAPABILITY = 'recruitment.manage';

/** The capability that lets somebody remove a Fleet's members. */
export const MEMBERS_MANAGE_CAPABILITY = 'members.manage';

/** Any one of these opens the Recruitment tab. */
export const RECRUITMENT_TAB_CAPABILITIES: readonly string[] = [
  APPLICATIONS_VIEW_CAPABILITY,
  APPLICATIONS_DECIDE_CAPABILITY,
  RECRUITMENT_MANAGE_CAPABILITY,
  MEMBERS_MANAGE_CAPABILITY,
];

/**
 * The same limits the server holds a form and its answers to, so an editor
 * or applicant is told before sending rather than after.
 */
export const RECRUITMENT_LIMITS = {
  QUESTIONS: 20,
  OPTIONS: 10,
  PROMPT: 300,
  OPTION: 100,
  REQUIREMENTS: 2000,
  SHORT_ANSWER: 200,
  LONG_ANSWER: 2000,
  DECISION_NOTE: 1000,
  REMOVAL_REASON: 500,
  USERNAME: 50,
  // The game's level cap. The server allows more, which no Character
  // could meet.
  MINIMUM_LEVEL: 65,
} as const;

/** What each kind of question is called in the form editor. */
export const QUESTION_KIND_LABELS: Record<ApplicationQuestionKind, string> = {
  [ApplicationQuestionKind.SHORT_TEXT]: 'Short answer',
  [ApplicationQuestionKind.LONG_TEXT]: 'Paragraph',
  [ApplicationQuestionKind.SINGLE_CHOICE]: 'One of a list',
  [ApplicationQuestionKind.YES_NO]: 'Yes or no',
};

/** How an application's status reads. */
export const APPLICATION_STATUS_LABELS: Record<FleetApplicationStatus, string> =
  {
    [FleetApplicationStatus.PENDING]: 'Waiting for a decision',
    [FleetApplicationStatus.ACCEPTED]: 'Accepted',
    [FleetApplicationStatus.REJECTED]: 'Rejected',
    [FleetApplicationStatus.WITHDRAWN]: 'Withdrawn',
  };

/** How somebody came, or asked, to be in a Fleet. */
export const APPLICATION_ROUTE_LABELS: Record<FleetApplicationRoute, string> = {
  [FleetApplicationRoute.APPLICATION]: 'Application',
  [FleetApplicationRoute.OPEN_JOIN]: 'Joined',
  [FleetApplicationRoute.INVITATION]: 'Invitation',
};

/**
 * How a Fleet proposal on a Character's page says recruitment raised it,
 * before asking them to confirm once they are in the Fleet in game.
 */
export const RECRUITED_BY_LINES: Record<FleetApplicationRoute, string> = {
  [FleetApplicationRoute.APPLICATION]: 'From your accepted application.',
  [FleetApplicationRoute.INVITATION]: 'From the invitation you accepted.',
  [FleetApplicationRoute.OPEN_JOIN]: 'From joining this Fleet.',
};

/** How an ended membership reads on the applicant's own list. */
export const MEMBERSHIP_ENDED_LINES: Record<
  ScopeMembershipStatus.LEFT | ScopeMembershipStatus.REVOKED,
  string
> = {
  [ScopeMembershipStatus.LEFT]: 'You have since left this Fleet.',
  [ScopeMembershipStatus.REVOKED]:
    'You have since been removed from this Fleet.',
};

/** How each step in an application's history reads. */
export const APPLICATION_ACTION_LABELS: Record<
  FleetApplicationActionKind,
  string
> = {
  [FleetApplicationActionKind.SUBMITTED]: 'Submitted',
  [FleetApplicationActionKind.WITHDRAWN]: 'Withdrawn',
  [FleetApplicationActionKind.ACCEPTED]: 'Accepted',
  [FleetApplicationActionKind.REJECTED]: 'Rejected',
};

/** How an invitation's state reads. */
export const INVITATION_STATE_LABELS: Record<FleetInvitationState, string> = {
  [FleetInvitationState.PENDING]: 'Waiting for an answer',
  [FleetInvitationState.ACCEPTED]: 'Accepted',
  [FleetInvitationState.DECLINED]: 'Declined',
  [FleetInvitationState.WITHDRAWN]: 'Withdrawn',
  [FleetInvitationState.LAPSED]: 'Lapsed',
};

/** How a membership's status reads on the members list. */
export const MEMBERSHIP_STATUS_LABELS: Record<ScopeMembershipStatus, string> = {
  [ScopeMembershipStatus.PENDING]: 'Pending',
  [ScopeMembershipStatus.APPROVED]: 'Member',
  [ScopeMembershipStatus.SUSPENDED]: 'Suspended',
  [ScopeMembershipStatus.REJECTED]: 'Rejected',
  [ScopeMembershipStatus.LEFT]: 'Left',
  [ScopeMembershipStatus.REVOKED]: 'Removed',
};

/**
 * Said wherever somebody is accepted, joins or accepts an invitation,
 * because the site cannot do the part that happens in the game.
 */
export const IN_GAME_INVITE_NOTE =
  'STO Info cannot invite anybody in game. Once a Fleet officer has sent the ' +
  'in-game invitation, confirm the Fleet on your Character’s page.';
