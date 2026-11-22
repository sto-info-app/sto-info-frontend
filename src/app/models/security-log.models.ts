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
  CHAT_MESSAGE_REMOVED: 'Removed a chat message',
  IMAGE_TAKEN_DOWN: 'Took down a picture refused for policy',
  IMAGE_KEPT: 'Kept a picture refused for policy',
  LEDGERS_RECONCILED: 'Restore check brought records back',
  SCAN_DIAGNOSTICS_VIEWED: 'Read Scan Diagnostics',
  SCAN_JOB_RETRIED: 'Retried failed jobs',
  SCAN_JOB_DISCARDED: 'Discarded failed jobs',
  PUBLICATION_PAUSED: 'Paused publication',
  PUBLICATION_RESUMED: 'Resumed publication',
  FEATURE_SWITCHED_ON: 'Switched a feature on',
  FEATURE_SWITCHED_OFF: 'Switched a feature off',
};

/** Each feature a site admin may switch on or off, by name (FC-045). */
export const FEATURE_SWITCH_LABELS: Readonly<Record<string, string>> = {
  FLEET_COMMUNITIES: 'Fleet Communities',
  STORYTIME: 'Storytime',
  CUSTOM_TRACKING: 'Custom Tracking',
};

/**
 * Site admin actions the system records itself, with no administrator
 * behind them: the restore check at start (FC-042). Their "Who" reads as the
 * system rather than as an account since closed.
 */
export const SYSTEM_SITE_ADMIN_ACTIONS: ReadonlySet<string> = new Set([
  'LEDGERS_RECONCILED',
]);

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
