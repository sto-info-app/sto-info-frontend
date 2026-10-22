/**
 * One count over the four windows the Site Statistics page shows (FC-053):
 * since 00:00 UTC today, the last seven days, the last thirty days, and ever.
 */
export interface CountWindows {
  today: number;
  last7Days: number;
  last30Days: number;
  allTime: number;
}

/** How many users hold a role. */
export interface RoleCount {
  role: string;
  count: number;
}

/** One week of a series, keyed by the Monday it starts on, as a date. */
export interface WeeklyCount {
  weekStarting: string;
  count: number;
}

/** The site's users. */
export interface UserStatistics {
  total: number;
  verified: number;
  disabled: number;
  closed: number;
  byRole: RoleCount[];
  registrations: CountWindows;
  active: CountWindows;
}

/** Storytime: what is live and what was newly published. */
export interface StorytimeStatistics {
  storiesPublished: CountWindows;
  chaptersPublished: CountWindows;
  arcsPublished: CountWindows;
  spotlightsLive: number;
  comments: CountWindows;
}

/** One kind of Fleet scope. */
export interface ScopeStatistics {
  active: number;
  registered: CountWindows;
}

/** Fleet Communities and chat. */
export interface FleetStatistics {
  communities: ScopeStatistics;
  fleets: ScopeStatistics;
  armadas: ScopeStatistics;
  members: number;
  chatMessages: CountWindows;
  applications: CountWindows;
  events: CountWindows;
}

/** Reports still waiting on a site admin. */
export interface OpenReports {
  members: number;
  chat: number;
  total: number;
}

/** STO records, the site's news and the moderation queues. */
export interface SiteContentStatistics {
  stoAccounts: CountWindows;
  stoCharacters: CountWindows;
  newsPublished: CountWindows;
  openReports: OpenReports;
}

/** Everything the Site Statistics page shows, read in one go. */
export interface SiteStatistics {
  generatedAt: string;
  users: UserStatistics;
  registrationsByWeek: WeeklyCount[];
  lastSeenByWeek: WeeklyCount[];
  storytime: StorytimeStatistics;
  fleet: FleetStatistics;
  content: SiteContentStatistics;
}

/** How each role is named on the page. */
export const ROLE_LABELS: Readonly<Record<string, string>> = {
  USER: 'Members',
  ADMIN: 'Site administrators',
  STORYTIME_CURATOR: 'Storytime curators',
};
