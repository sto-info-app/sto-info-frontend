export type CharacterReputationStatus =
  'not_started' | 'in_progress' | 'complete';

/** The maximum reputation tier a character can attain. */
export const REPUTATION_MAX_TIER = 6;

/** Cumulative XP required to reach each reputation tier (1-6). */
export const REPUTATION_TIER_XP: Record<number, number> = {
  1: 2500,
  2: 10000,
  3: 25000,
  4: 50000,
  5: 100000,
  6: 250000,
};

export interface CharacterReputation {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  accentColor: string | null;
  releasedWith: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterReputationProgress {
  id: string;
  characterId: string;
  reputationId: string;
  reputation: CharacterReputation;
  currentTier: number;
  status: CharacterReputationStatus;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterReputationSummary {
  totalTiers: number;
  maxPossibleTiers: number;
  overallCompletionPercentage: number;
  completedReputations: number;
  totalReputations: number;
}
