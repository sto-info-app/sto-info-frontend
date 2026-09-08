export type CharacterAdmiraltyStatus =
  'not_started' | 'in_progress' | 'complete';

export const ADMIRALTY_MAX_TIER = 10;
export const ADMIRALTY_MAX_TOUR_STEP = 10;
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
