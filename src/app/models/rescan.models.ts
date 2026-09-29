/** Who a rescan campaign is for (FC-041). */
export enum RescanCampaignKind {
  MANUAL = 'MANUAL',
  LEGACY = 'LEGACY',
}

/** Where a campaign is. */
export enum RescanCampaignState {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

/** How each state reads. */
export const RESCAN_STATE_LABELS: Readonly<
  Record<RescanCampaignState, string>
> = {
  [RescanCampaignState.RUNNING]: 'Running',
  [RescanCampaignState.PAUSED]: 'Paused',
  [RescanCampaignState.DONE]: 'Finished',
  [RescanCampaignState.CANCELLED]: 'Cancelled',
  [RescanCampaignState.FAILED]: 'Stopped by an error',
};

/** The picture kinds a campaign may select, and what they are called. */
export const RESCAN_KIND_LABELS: Readonly<Record<string, string>> = {
  PROFILE_IMAGE: 'Profile pictures',
  CHARACTER_IMAGE: 'Character portraits',
  STORYTIME_IMAGE: 'Storytime artwork',
  CUSTOM_TRACKING_IMAGE: 'Custom Tracking pictures',
  FLEET_IMAGE: 'Fleet artwork',
};

/** What a campaign's counts are called. */
export const RESCAN_COUNT_LABELS: Readonly<Record<string, string>> = {
  requested: 'Asked for',
  clean: 'Clean',
  infected: 'Infected, taken down',
  refused: 'Refused for policy',
  failed: 'No verdict',
  skipped: 'Already rescanned',
};

/** Which pictures a campaign rescans. Every field narrows it. */
export interface RescanSelection {
  kinds?: string[];
  uploadedFrom?: string;
  uploadedBefore?: string;
  notScannedForDays?: number;
  unverifiedOnly?: boolean;
  priority?: 'HIGH' | 'LOW';
}

/** One campaign. */
export interface RescanCampaign {
  readonly id: string;
  readonly kind: RescanCampaignKind;
  readonly state: RescanCampaignState;
  readonly selection: RescanSelection;
  readonly counts: Readonly<Record<string, number>>;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
}

/** A refusal or infection, by asset and code. */
export interface RescanFinding {
  readonly assetId: string;
  readonly state: 'INFECTED' | 'REFUSED';
  readonly rejectionCode: string | null;
  readonly verdictAt: string | null;
}

/** Where the campaigns stand. */
export interface RescanOverview {
  readonly campaigns: readonly RescanCampaign[];
  /** Rescans waiting for a verdict. */
  readonly waiting: number;
  /** Legacy pictures still never scanned. */
  readonly unverified: number;
  readonly findings: readonly RescanFinding[];
}
