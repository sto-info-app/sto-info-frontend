/**
 * What a Fleet's reports are called, and their bands and audiences, in
 * words (FC-020).
 */

import { FleetAudience } from 'src/app/models/fleet.models';
import {
  FleetReport,
  RecruitmentRoute,
  RosterActivityBand,
  RosterTenureBand,
} from 'src/app/models/fleet-report.models';

/** The reports, in the order they are offered. */
export const FLEET_REPORTS: readonly FleetReport[] = [
  FleetReport.GROWTH,
  FleetReport.ACTIVITY,
  FleetReport.TENURE,
  FleetReport.RANKS,
  FleetReport.CONTRIBUTION,
  FleetReport.ATTENDANCE,
  FleetReport.RECRUITMENT,
  FleetReport.HOLDINGS,
];

/** Each report's name. */
export const FLEET_REPORT_LABELS: Readonly<Record<FleetReport, string>> = {
  [FleetReport.GROWTH]: 'Growth',
  [FleetReport.ACTIVITY]: 'Activity',
  [FleetReport.TENURE]: 'Tenure',
  [FleetReport.RANKS]: 'Ranks',
  [FleetReport.CONTRIBUTION]: 'Contribution',
  [FleetReport.ATTENDANCE]: 'Attendance',
  [FleetReport.RECRUITMENT]: 'Recruitment',
  [FleetReport.HOLDINGS]: 'Holdings',
};

/** The reports read from the roster history. */
export const ROSTER_REPORTS: readonly FleetReport[] = [
  FleetReport.GROWTH,
  FleetReport.ACTIVITY,
  FleetReport.TENURE,
  FleetReport.RANKS,
  FleetReport.CONTRIBUTION,
];

/** How each way of recruiting reads (FC-030). */
export const RECRUITMENT_ROUTE_LABELS: Readonly<
  Record<RecruitmentRoute, string>
> = {
  APPLICATION: 'Applications',
  OPEN_JOIN: 'Open joins',
  INVITATION: 'Invitations',
};

/**
 * Who an audience lets see one report, and how much of it. The Fleet's
 * members see attendance as counts only (FC-030).
 *
 * @param report - The report.
 * @param audience - The audience.
 * @returns The words.
 */
export function fleetReportAudienceLabel(
  report: FleetReport,
  audience: FleetAudience,
): string {
  return report === FleetReport.ATTENDANCE &&
    audience === FleetAudience.FLEET_MEMBERS
    ? 'The Fleet’s members, counts only'
    : FLEET_REPORT_AUDIENCE_LABELS[audience];
}

/**
 * Who each audience lets see a report, and how much of it.
 *
 * For a report, private means its `reports.view` holders — the Owner and
 * Admins — not the Owner alone as it does for a Fleet record.
 */
export const FLEET_REPORT_AUDIENCE_LABELS: Readonly<
  Record<FleetAudience, string>
> = {
  [FleetAudience.PRIVATE]: 'The Owner and Admins',
  [FleetAudience.FLEET_MEMBERS]: 'The Fleet’s members, in full',
  [FleetAudience.COMMUNITY]: 'The Community’s followers, counts only',
  [FleetAudience.PUBLIC]: 'Anyone, counts only',
};

/** The audiences, narrowest first. */
export const FLEET_REPORT_AUDIENCES: readonly FleetAudience[] = [
  FleetAudience.PRIVATE,
  FleetAudience.FLEET_MEMBERS,
  FleetAudience.COMMUNITY,
  FleetAudience.PUBLIC,
];

/** How recently members had been active, most recent first. */
export const ACTIVITY_BANDS: readonly RosterActivityBand[] = [
  RosterActivityBand.WITHIN_7_DAYS,
  RosterActivityBand.WITHIN_30_DAYS,
  RosterActivityBand.WITHIN_90_DAYS,
  RosterActivityBand.OVER_90_DAYS,
  RosterActivityBand.UNKNOWN,
];

/** Each activity band, measured back from the export's own instant. */
export const ACTIVITY_BAND_LABELS: Readonly<
  Record<RosterActivityBand, string>
> = {
  [RosterActivityBand.WITHIN_7_DAYS]: '7 days or less',
  [RosterActivityBand.WITHIN_30_DAYS]: '7 to 30 days',
  [RosterActivityBand.WITHIN_90_DAYS]: '30 to 90 days',
  [RosterActivityBand.OVER_90_DAYS]: 'Over 90 days',
  [RosterActivityBand.UNKNOWN]: 'Not given',
};

/** How long members had been listed, shortest first. */
export const TENURE_BANDS: readonly RosterTenureBand[] = [
  RosterTenureBand.UNDER_30_DAYS,
  RosterTenureBand.DAYS_30_TO_90,
  RosterTenureBand.MONTHS_3_TO_12,
  RosterTenureBand.YEARS_1_TO_2,
  RosterTenureBand.OVER_2_YEARS,
];

/** Each tenure band, measured back from the export. */
export const TENURE_BAND_LABELS: Readonly<Record<RosterTenureBand, string>> = {
  [RosterTenureBand.UNDER_30_DAYS]: 'Under 30 days',
  [RosterTenureBand.DAYS_30_TO_90]: '30 to 90 days',
  [RosterTenureBand.MONTHS_3_TO_12]: '90 days to a year',
  [RosterTenureBand.YEARS_1_TO_2]: '1 to 2 years',
  [RosterTenureBand.OVER_2_YEARS]: '2 years or more',
};
