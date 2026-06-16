export type EndeavourCategory = 'Space' | 'Ground';
export type EndeavourBoostUnit = 'percent' | 'flat';
export type EndeavourStatus = 'not_started' | 'in_progress' | 'complete';
export type EndeavourSortBy = 'nodes' | 'name';

export interface EndeavourPerk {
  id: string;
  name: string;
  category: EndeavourCategory;
  description: string | null;
  boostPerRank: number;
  boostMax: number;
  boostUnit: EndeavourBoostUnit;
  maxNodes: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EndeavourProgress {
  id: string;
  accountId: string;
  endeavourPerkId: string;
  endeavourPerk: EndeavourPerk;
  currentNodes: number;
  status: EndeavourStatus;
  completionPercentage: number;
  totalBoostEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface EndeavourSummary {
  totalNodes: number;
  maxPossibleNodes: number;
  overallCompletionPercentage: number;
  maxedPerks: number;
  totalPerks: number;
  spaceNodes: number;
  spaceMaxNodes: number;
  spaceCompletionPercentage: number;
  groundNodes: number;
  groundMaxNodes: number;
  groundCompletionPercentage: number;
}
