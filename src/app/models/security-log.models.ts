/** Where a Security Log entry comes from (FC-039). */
export enum SecurityLogSource {
  SITE_ADMIN = 'SITE_ADMIN',
  FLEET = 'FLEET',
  HOLD = 'HOLD',
  INVESTIGATION = 'INVESTIGATION',
  ERASURE = 'ERASURE',
  RETENTION = 'RETENTION',
}

/** How each source is named on the page. */
export const SECURITY_LOG_SOURCE_LABELS: Readonly<
  Record<SecurityLogSource, string>
> = {
  [SecurityLogSource.SITE_ADMIN]: 'Site admin actions',
  [SecurityLogSource.FLEET]: 'Fleet disputes',
  [SecurityLogSource.HOLD]: 'Moderation holds',
  [SecurityLogSource.INVESTIGATION]: 'Fleet investigations',
  [SecurityLogSource.ERASURE]: 'Roster erasures',
  [SecurityLogSource.RETENTION]: 'Retention runs',
};

/** What each site admin action is called. */
export const SITE_ADMIN_ACTION_LABELS: Readonly<Record<string, string>> = {
  USER_ROLE_CHANGED: 'Changed a role',
  PERMISSION_OVERRIDE_SET: 'Set a permission override',
  PERMISSION_OVERRIDE_REMOVED: 'Withdrew a permission override',
  LIMIT_OVERRIDE_SET: 'Set a limit override',
  LIMIT_OVERRIDE_REMOVED: 'Withdrew a limit override',
  USER_DISABLED: 'Disabled an account',
  USER_ENABLED: 'Restored an account',
  USER_REPORT_DECIDED: 'Decided a member report',
  CHAT_REPORT_DECIDED: 'Decided a chat report',
  CUSTOM_TRACKING_SUPPRESSED: 'Suppressed Custom Tracking',
  CUSTOM_TRACKING_RESTORED: 'Restored Custom Tracking',
  STORYTIME_CONTENT_REMOVED: 'Removed Storytime content',
  STORYTIME_CONTENT_RESTORED: 'Restored Storytime content',
  STORYTIME_REPORT_DECIDED: 'Decided a Storytime report',
  STORYTIME_APPEAL_DECIDED: 'Decided a Storytime appeal',
  IMAGE_COPY_STARTED: 'Started copying pictures to private',
  IMAGE_UNDO_STARTED: 'Started undoing picture copies',
  IMAGE_RETIRE_STARTED: 'Started retiring old picture copies',
  IMAGE_RUN_PAUSED: 'Paused a picture run',
  IMAGE_RUN_RESUMED: 'Resumed a picture run',
  RESCAN_STARTED: 'Started a rescan campaign',
  RESCAN_PAUSED: 'Paused a rescan campaign',
  RESCAN_RESUMED: 'Resumed a rescan campaign',
  RESCAN_CANCELLED: 'Cancelled a rescan campaign',
};

/** Somebody an entry names. */
export interface SecurityLogPerson {
  readonly userId: string;
  readonly username: string | null;
}

/** One entry: who, when, what, to whom or what, and why. */
export interface SecurityLogEntry {
  readonly source: SecurityLogSource;
  readonly id: string;
  readonly at: string;
  /** What was done, as its own log names it. */
  readonly action: string;
  /** Null for what the system did, or an account since closed. */
  readonly actor: SecurityLogPerson | null;
  readonly target: SecurityLogPerson | null;
  readonly subjectKind: string | null;
  readonly subjectId: string | null;
  readonly reason: string | null;
  /** Codes, states, counts and IDs; never content. */
  readonly detail: Record<string, unknown> | null;
}

/** A page of the Security Log, newest first. */
export interface SecurityLogPage {
  readonly items: SecurityLogEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
