/**
 * A Fleet's reports and who may see each, as FC-020's routes give them.
 *
 * In an aggregate view, a count or total that is null was hidden: it counted
 * from 1 to 4 members, or would have let one that did be worked out.
 */

import { FleetAudience } from 'src/app/models/fleet.models';
import {
  RosterChangeKind,
  RosterCoverage,
  RosterExportRef,
  RosterMemberName,
  RosterRevision,
} from 'src/app/models/fleet-roster.models';

/** The reports a Fleet has. */
export enum FleetReport {
  GROWTH = 'GROWTH',
  TENURE = 'TENURE',
  RANKS = 'RANKS',
  ACTIVITY = 'ACTIVITY',
  CONTRIBUTION = 'CONTRIBUTION',
  /** Who came to the Fleet's own events (FC-030). */
  ATTENDANCE = 'ATTENDANCE',
  /** How applications and invitations turned out (FC-030). */
  RECRUITMENT = 'RECRUITMENT',
  /** How the Fleet's holdings changed (FC-030). Public. */
  HOLDINGS = 'HOLDINGS',
}

/** How much of a report a viewer is shown. */
export enum FleetReportView {
  /** Everything, names included. */
  FULL = 'FULL',
  /** Counts and totals only, none from 1 to 4. */
  AGGREGATE = 'AGGREGATE',
}

/** A report a viewer may see, and how much of it. */
export interface FleetReportAccess {
  report: FleetReport;
  view: FleetReportView;
}

/** The span a report covers, and the export its detail is drawn at. */
export interface FleetReportQuery {
  from?: string;
  to?: string;
  at?: string;
}

/** What every report says about itself. */
export interface FleetReportHeader extends RosterRevision {
  report: FleetReport;
  view: FleetReportView;
  range: { from: string | null; to: string | null };
  coverage: RosterCoverage;
  minimumCohort: number;
}

/** Growth and loss between two consecutive effective exports. */
export interface GrowthInterval {
  from: RosterExportRef;
  to: RosterExportRef;
  partial: boolean;
  membersAtStart: number | null;
  membersAtEnd: number | null;
  joined: number | null;
  rejoined: number | null;
  left: number | null;
  unknown: number | null;
  acrossGap: number | null;
  accountsAtStart: number | null;
  accountsAtEnd: number | null;
}

/** Growth and loss, oldest interval first. */
export interface FleetGrowthReport extends FleetReportHeader {
  intervals: GrowthInterval[];
}

/** How recently a member was active, measured back from an export. */
export enum RosterActivityBand {
  WITHIN_7_DAYS = 'WITHIN_7_DAYS',
  WITHIN_30_DAYS = 'WITHIN_30_DAYS',
  WITHIN_90_DAYS = 'WITHIN_90_DAYS',
  OVER_90_DAYS = 'OVER_90_DAYS',
  UNKNOWN = 'UNKNOWN',
}

/** How recently an export's members had been active. */
export interface ActivityExport {
  export: RosterExportRef;
  partial: boolean;
  members: number | null;
  bands: Record<RosterActivityBand, number | null>;
}

/** Imported activity at each export, oldest first. */
export interface FleetActivityReport extends FleetReportHeader {
  exports: ActivityExport[];
}

/** How long a member had been listed at an export. */
export enum RosterTenureBand {
  UNDER_30_DAYS = 'UNDER_30_DAYS',
  DAYS_30_TO_90 = 'DAYS_30_TO_90',
  MONTHS_3_TO_12 = 'MONTHS_3_TO_12',
  YEARS_1_TO_2 = 'YEARS_1_TO_2',
  OVER_2_YEARS = 'OVER_2_YEARS',
}

/** How long an export's members had been listed. */
export interface TenureExport {
  export: RosterExportRef;
  partial: boolean;
  members: number | null;
  bands: Record<RosterTenureBand, number | null>;
  /** Of each band, those no earlier export bounds: at least that long. */
  atLeast: Record<RosterTenureBand, number | null>;
}

/** One member at the detail export, and how long they had been listed. */
export interface TenureMember {
  identityId: string;
  characterName: string;
  accountHandle: string;
  firstObservedAt: string;
  days: number;
  band: RosterTenureBand;
  atLeast: boolean;
}

/** Observed tenure at each export, oldest first. */
export interface FleetTenureReport extends FleetReportHeader {
  exports: TenureExport[];
  at: RosterExportRef | null;
  members: TenureMember[] | null;
}

/** A rank label's members at one export. */
export interface RankCount {
  label: string;
  tier: number | null;
  members: number | null;
}

/** The rank changes an export revealed. */
export interface RankChangeCount {
  promoted: number | null;
  demoted: number | null;
  changed: number | null;
  acrossGap: number | null;
}

/** An export's rank distribution. */
export interface RanksExport {
  export: RosterExportRef;
  partial: boolean;
  labels: RankCount[];
  /** Null for the Fleet's first export. */
  changes: RankChangeCount | null;
}

/** Rank distribution at each export, oldest first. */
export interface FleetRanksReport extends FleetReportHeader {
  exports: RanksExport[];
}

/** What was contributed between two consecutive effective exports. */
export interface ContributionInterval {
  from: RosterExportRef;
  to: RosterExportRef;
  partial: boolean;
  /** The sum of every known rise, as a decimal string. */
  contributionDelta: string | null;
  known: number | null;
  reset: number | null;
  baseline: number | null;
  unknown: number | null;
}

/** One member's rise or reset in the detail interval. */
export interface ContributionMember {
  identityId: string;
  member: RosterMemberName | null;
  kind: RosterChangeKind;
  /** Null for a reset. */
  delta: string | null;
  fromContribution: string | null;
  toContribution: string | null;
  from: RosterExportRef | null;
  acrossGap: boolean;
}

/** Contribution, oldest interval first. */
export interface FleetContributionReport extends FleetReportHeader {
  intervals: ContributionInterval[];
  at: RosterExportRef | null;
  members: ContributionMember[] | null;
}

/** One report's audience now. */
export interface FleetReportAudience {
  report: FleetReport;
  audience: FleetAudience;
  updatedAt: string | null;
}

/** One change to a report's audience. */
export interface FleetReportAudienceChange {
  id: string;
  report: FleetReport;
  audienceBefore: FleetAudience;
  audienceAfter: FleetAudience;
  actorName: string | null;
  changedAt: string;
}

/** Every report's audience, and how each came to be. */
export interface FleetReportAudiences {
  reports: FleetReportAudience[];
  changes: FleetReportAudienceChange[];
}

/**
 * What a report built from the Fleet's own records says about itself
 * (FC-030): no roster revision or exports, only its span and view.
 */
export interface FleetRecordReportHeader {
  report: FleetReport;
  view: FleetReportView;
  range: { from: string; to: string };
  minimumCohort: number;
}

/** One occurrence of one of the Fleet's own events, and who came. */
export interface AttendanceOccurrenceRow {
  occurrenceId: string;
  eventId: string;
  title: string;
  startsAt: string;
  going: number | null;
  attended: number | null;
  absent: number | null;
  /** Attended out of everybody recorded, 0 to 1. */
  rate: number | null;
}

/** One person's attendance over the span, for the full view alone. */
export interface AttendanceMemberRow {
  username: string | null;
  attended: number;
  absent: number;
}

/** Who came to the Fleet's own events. */
export interface FleetAttendanceReport extends FleetRecordReportHeader {
  occurrences: AttendanceOccurrenceRow[];
  totals: {
    occurrences: number;
    attended: number | null;
    absent: number | null;
    rate: number | null;
  };
  /** Each person; null unless the reader sees it in full. */
  members: AttendanceMemberRow[] | null;
}

/** How a Fleet recruits someone. */
export type RecruitmentRoute = 'APPLICATION' | 'OPEN_JOIN' | 'INVITATION';

/** How one route's requests in one month turned out. */
export interface RecruitmentMonthRow {
  /** YYYY-MM. */
  month: string;
  route: RecruitmentRoute;
  received: number | null;
  accepted: number | null;
  declined: number | null;
  withdrawn: number | null;
  lapsed: number | null;
  pending: number | null;
  medianDaysToDecision: number | null;
}

/** How applications and invitations turned out. */
export interface FleetRecruitmentReport extends FleetRecordReportHeader {
  months: RecruitmentMonthRow[];
}

/** One track's tier changed. */
export interface HoldingsChangeRow {
  at: string;
  holding: string;
  track: string;
  from: number;
  to: number;
}

/** How the Fleet's holdings changed, newest first. */
export interface FleetHoldingsReport extends FleetRecordReportHeader {
  changes: HoldingsChangeRow[];
}
