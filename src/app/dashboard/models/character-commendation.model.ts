export type CharacterCommendationStatus =
  'not_started' | 'in_progress' | 'complete';

/** The highest commendation rank a captain can attain in a category. */
export const COMMENDATION_MAX_RANK = 4;

/** The captain level at which the duty officer system unlocks. */
export const COMMENDATION_UNLOCK_LEVEL = 11;

/** Cumulative CXP required to reach each commendation rank (1-4). */
export const COMMENDATION_RANK_CXP: Record<number, number> = {
  1: 2500,
  2: 15000,
  3: 50000,
  4: 100000,
};

/**
 * The allegiances that settle which faction-specific categories a captain
 * earns. A captain recorded as anything else - "Undecided", or with no
 * allegiance at all - cannot be shown an accurate catalogue, so the tracker
 * is gated until one is chosen.
 */
export const COMMENDATION_ALLEGIANCES = ['Federation', 'Klingon'];

/** The allegiance whose captains are shown the Klingon icon artwork. */
export const COMMENDATION_KLINGON_ALLEGIANCE = 'Klingon';

export interface CharacterCommendation {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  iconUrlKlingon: string | null;
  accentColor: string | null;
  factionRestriction: string | null;
  sortOrder: number;
}

export interface CharacterCommendationProgress {
  id: string;
  characterId: string;
  commendationId: string;
  commendation: CharacterCommendation;
  currentRank: number;
  status: CharacterCommendationStatus;
  completionPercentage: number;
}

export interface CharacterCommendationSummary {
  totalRanks: number;
  maxPossibleRanks: number;
  overallCompletionPercentage: number;
  completedCommendations: number;
  totalCommendations: number;
}
