export type CharacterAdmiraltyStatus =
  'not_started' | 'in_progress' | 'complete';

export const ADMIRALTY_MAX_TIER = 10;
/**
 * The furthest a Tour of Duty can be recorded at. The game pays the tour
 * reward on the tenth step and starts the tour again, so the count a captain
 * can sit at runs 0 to 9.
 */
export const ADMIRALTY_MAX_TOUR_STEP = 9;
export const ADMIRALTY_UNLOCK_LEVEL = 52;

export interface CharacterAdmiraltyCampaign {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  accentColor: string | null;
  sortOrder: number;
}

export interface CharacterAdmiraltyProgress {
  id: string;
  characterId: string;
  campaignId: string;
  campaign: CharacterAdmiraltyCampaign;
  currentTier: number;
  tourOfDutyStep: number;
  status: CharacterAdmiraltyStatus;
  completionPercentage: number;
}

export interface CharacterAdmiraltySummary {
  totalTiers: number;
  maxPossibleTiers: number;
  completedCampaigns: number;
  totalCampaigns: number;
  totalTourSteps: number;
  maxPossibleTourSteps: number;
  overallCompletionPercentage: number;
}
