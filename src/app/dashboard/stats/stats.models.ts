/** Represents a name-count pair used for breakdown stats. */
export interface CountItem {
  name: string;
  count: number;
}

/** The full set of stats returned by GET /stats. */
export interface StatsData {
  accountCount: number;
  lifetimeSubCount: number;
  characterCount: number;
  avgLevel: number;
  minLevel: number;
  maxLevel: number;
  bySpecies: CountItem[];
  byGeneralFaction: CountItem[];
  byFaction: CountItem[];
  byClass: CountItem[];
  bySex: CountItem[];
  byRecruitType: CountItem[];
  byLevelRange: CountItem[];
  byPlatform: CountItem[];
  byLauncher: CountItem[];
  endeavourTotalNodes: number;
  endeavourMaxNodes: number;
  byEndeavourPerk: CountItem[];
  byEndeavourPerkAvg: CountItem[];
  byEndeavourCategory: CountItem[];
  byEndeavourCategoryPct: CountItem[];
}
