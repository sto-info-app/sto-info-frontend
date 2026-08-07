/**
 * Why a member is being reported. Values match the API's `reason`.
 */
export enum ReportReason {
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  SPAM = 'SPAM',
  IMPERSONATION = 'IMPERSONATION',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  OTHER = 'OTHER',
}

/**
 * Where a report sits in the moderation queue. Values match the API's `status`.
 */
export enum ReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIONED = 'ACTIONED',
  DISMISSED = 'DISMISSED',
}

/**
 * One side of a report, as the admin queue shows it.
 */
export interface ReportParty {
  userId: string;
  username: string | null;
  profilePicture100: string | null;
  isAccountDisabled: boolean;
}

/**
 * A report as presented to administrators.
 */
export interface UserReport {
  id: string;
  reporter: ReportParty;
  reported: ReportParty;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  moderatorNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/**
 * A page of reports, with the queue-wide unresolved count.
 */
export interface PaginatedReports {
  items: UserReport[];
  total: number;
  page: number;
  pageSize: number;
  openCount: number;
}

/**
 * Query parameters accepted by the admin report queue.
 */
export interface ReportQuery {
  status?: ReportStatus;
  reason?: ReportReason;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Payload for reporting a member.
 */
export interface CreateUserReportRequest {
  username: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Payload for an administrator's decision on a report.
 */
export interface UpdateReportRequest {
  status: ReportStatus;
  moderatorNotes?: string;
}

/**
 * A member as the admin user list shows them.
 */
export interface ModeratedUser {
  id: string;
  email: string;
  username: string | null;
  role: string;
  isAccountDisabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  openReportCount: number;
}

/**
 * A page of members.
 */
export interface PaginatedModeratedUsers {
  items: ModeratedUser[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Query parameters accepted by the admin user list.
 */
export interface ModeratedUserQuery {
  search?: string;
  disabled?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Payload for disabling a member's account.
 */
export interface DisableUserRequest {
  reason?: string;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.HARASSMENT]: 'Harassment or threats',
  [ReportReason.HATE_SPEECH]: 'Hate speech',
  [ReportReason.SPAM]: 'Spam or scams',
  [ReportReason.IMPERSONATION]: 'Impersonation',
  [ReportReason.INAPPROPRIATE_CONTENT]: 'Inappropriate content',
  [ReportReason.OTHER]: 'Something else',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.OPEN]: 'Open',
  [ReportStatus.UNDER_REVIEW]: 'Under review',
  [ReportStatus.ACTIONED]: 'Actioned',
  [ReportStatus.DISMISSED]: 'Dismissed',
};

/**
 * The `status-pill` modifier each report state is rendered with, reusing the
 * admin record styles shared with the news and banner screens.
 */
export const REPORT_STATUS_PILL_CLASSES: Record<ReportStatus, string> = {
  [ReportStatus.OPEN]: 'warning',
  [ReportStatus.UNDER_REVIEW]: 'info',
  [ReportStatus.ACTIONED]: 'success',
  [ReportStatus.DISMISSED]: 'draft',
};
