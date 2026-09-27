import {
  CharacterFleetSummary,
  FleetRecruitmentState,
} from 'src/app/models/fleet.models';

/** Where somebody's membership of a Fleet stands. */
export enum ScopeMembershipStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  LEFT = 'LEFT',
  REVOKED = 'REVOKED',
}

/** The kinds of question a Fleet's application form may ask (FC-021). */
export enum ApplicationQuestionKind {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  YES_NO = 'YES_NO',
}

/** How somebody came, or asked, to be in a Fleet. */
export enum FleetApplicationRoute {
  APPLICATION = 'APPLICATION',
  OPEN_JOIN = 'OPEN_JOIN',
  INVITATION = 'INVITATION',
}

/** Where an application stands. */
export enum FleetApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

/** What happened to an application, as its history records it. */
export enum FleetApplicationActionKind {
  SUBMITTED = 'SUBMITTED',
  WITHDRAWN = 'WITHDRAWN',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/** Where an invitation stands, its expiry read. */
export enum FleetInvitationState {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
  LAPSED = 'LAPSED',
}

/** One question on a Fleet's application form. */
export interface RecruitmentQuestion {
  readonly id: string;
  readonly kind: ApplicationQuestionKind;
  readonly prompt: string;
  readonly required: boolean;
  readonly options: readonly string[];
}

/** A faction a Fleet allows, named. */
export interface RecruitmentFaction {
  readonly id: string;
  readonly name: string;
}

/** How a Fleet recruits now. */
export interface RecruitmentSettings {
  /** 0 when the Fleet has never saved a version. */
  readonly version: number;
  readonly recruitmentState: FleetRecruitmentState;
  readonly requirementsText: string | null;
  readonly minimumLevel: number | null;
  readonly factions: readonly RecruitmentFaction[];
  readonly questions: readonly RecruitmentQuestion[];
  readonly savedAt: string | null;
}

/** One of the viewer's own applications to a Fleet, still waiting. */
export interface RecruitmentPendingApplication {
  readonly id: string;
  readonly characterName: string;
  readonly submittedAt: string;
}

/** Where the signed-in viewer stands with a Fleet's recruitment. */
export interface RecruitmentViewer {
  readonly isOwner: boolean;
  readonly membershipStatus: ScopeMembershipStatus | null;
  readonly pendingApplications: readonly RecruitmentPendingApplication[];
  readonly openInvitation: {
    readonly id: string;
    readonly expiresAt: string;
  } | null;
  readonly canViewApplications: boolean;
  readonly canDecideApplications: boolean;
  readonly canManageRecruitment: boolean;
  readonly canManageMembers: boolean;
}

/** How a Fleet recruits, and where the viewer stands. */
export interface FleetRecruitmentView {
  readonly settings: RecruitmentSettings;
  /** Null when signed out. */
  readonly viewer: RecruitmentViewer | null;
}

/** One question as an editor sends it. */
export interface RecruitmentQuestionInput {
  /** Omitted for a new question. */
  readonly id?: string;
  readonly kind: ApplicationQuestionKind;
  readonly prompt: string;
  readonly required: boolean;
  readonly options: readonly string[];
}

/** A new version of how a Fleet recruits. */
export interface UpdateRecruitmentSettingsRequest {
  readonly expectedVersion: number;
  readonly recruitmentState: FleetRecruitmentState;
  readonly requirementsText: string | null;
  readonly minimumLevel: number | null;
  readonly factionIds: readonly string[];
  readonly questions: readonly RecruitmentQuestionInput[];
}

/** One answer as an applicant sends it. */
export interface ApplicationAnswerInput {
  readonly questionId: string;
  readonly value: string | boolean;
}

/** An application to a Fleet. */
export interface SubmitFleetApplicationRequest {
  readonly characterId: string;
  readonly settingsVersion: number;
  readonly answers: readonly ApplicationAnswerInput[];
}

/** One of the viewer's own applications, joins or accepted invitations. */
export interface MyFleetApplication {
  readonly id: string;
  readonly fleet: CharacterFleetSummary;
  readonly status: FleetApplicationStatus;
  readonly route: FleetApplicationRoute;
  readonly characterName: string;
  readonly submittedAt: string;
  readonly decidedAt: string | null;
  readonly decisionNote: string | null;
  /**
   * For an accepted application, how the membership it granted has since
   * ended; null while it stands, and for anything not accepted.
   */
  readonly membershipEnded:
    ScopeMembershipStatus.LEFT | ScopeMembershipStatus.REVOKED | null;
  /** Whether they may still see the Fleet, and so open it. */
  readonly fleetVisible: boolean;
}

/** The roster's evidence about an applicant's Character. */
export interface ApplicationRosterEvidence {
  readonly listed: boolean;
  readonly latestExportAt: string | null;
  readonly listedSince: string | null;
  readonly rank: string | null;
  readonly everListed: boolean;
}

/** One row of a Fleet's application inbox. */
export interface FleetApplicationSummary {
  readonly id: string;
  readonly status: FleetApplicationStatus;
  readonly route: FleetApplicationRoute;
  readonly applicantUsername: string | null;
  readonly characterName: string;
  readonly characterLevel: number | null;
  readonly factionName: string | null;
  readonly submittedAt: string;
  readonly decidedAt: string | null;
}

/** A page of a Fleet's applications. */
export interface FleetApplicationPage {
  readonly items: readonly FleetApplicationSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

/** One answer, beside the question it answered. */
export interface ApplicationAnswer {
  readonly questionId: string;
  readonly prompt: string;
  readonly kind: ApplicationQuestionKind;
  readonly value: string | boolean | null;
}

/** One thing that happened to an application. */
export interface FleetApplicationAction {
  readonly action: FleetApplicationActionKind;
  readonly actorUsername: string | null;
  readonly note: string | null;
  readonly at: string;
}

/** One application in full, for a decider. */
export interface FleetApplicationDetail extends FleetApplicationSummary {
  readonly answers: readonly ApplicationAnswer[];
  readonly settingsVersion: number;
  readonly decisionNote: string | null;
  readonly decidedByUsername: string | null;
  readonly revision: number;
  readonly evidence: ApplicationRosterEvidence;
  readonly history: readonly FleetApplicationAction[];
}

/** A decision on an application. */
export interface DecideFleetApplicationRequest {
  readonly decision: 'ACCEPT' | 'REJECT';
  readonly note?: string;
  readonly revision: number;
}

/** An invitation, as the Fleet's officers see it. */
export interface FleetInvitation {
  readonly id: string;
  readonly invitedUsername: string | null;
  readonly invitedByUsername: string | null;
  readonly state: FleetInvitationState;
  readonly sentAt: string;
  readonly expiresAt: string;
  readonly answeredAt: string | null;
}

/** An open invitation, as its invitee sees it. */
export interface MyFleetInvitation {
  readonly id: string;
  readonly fleet: CharacterFleetSummary;
  readonly invitedByUsername: string | null;
  readonly sentAt: string;
  readonly expiresAt: string;
}

/** A Fleet member, as the Recruitment tab lists them. */
export interface FleetMember {
  readonly membershipId: string;
  readonly username: string | null;
  readonly status: ScopeMembershipStatus;
  readonly memberSince: string | null;
  readonly route: FleetApplicationRoute | null;
  readonly characterName: string | null;
}
