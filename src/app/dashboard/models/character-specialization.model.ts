export type CharacterSpecializationStatus =
  'not_started' | 'in_progress' | 'complete';

/**
 * Whether a specialization can be slotted as a captain's Primary (and therefore
 * also as their Secondary), or is a Secondary-only specialization.
 */
export type SpecializationType = 'primary' | 'secondary';

/** The captain slot a specialization is currently active in. */
export type SpecializationSlot = 'primary' | 'secondary';

/** Points needed to fully purchase a Primary-capable specialization. */
export const SPECIALIZATION_PRIMARY_MAX_POINTS = 30;

/** Points needed to fully purchase a Secondary-only specialization. */
export const SPECIALIZATION_SECONDARY_MAX_POINTS = 15;

/**
 * Points that must be spent in a Primary-capable specialization before its
 * Specialization Qualification (bridge officer training manual) can be crafted.
 * Secondary-only specializations have no qualification to unlock.
 */
export const SPECIALIZATION_QUALIFICATION_POINTS = 10;

/**
 * The captain level at which the specialization system unlocks; every level-up
 * from here on awards one point, and points keep accruing past the level cap.
 */
export const SPECIALIZATION_UNLOCK_LEVEL = 50;

export interface CharacterSpecialization {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  accentColor: string | null;
  type: SpecializationType;
  maxPoints: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSpecializationProgress {
  id: string;
  characterId: string;
  specializationId: string;
  specialization: CharacterSpecialization;
  pointsSpent: number;
  slot: SpecializationSlot | null;
  status: CharacterSpecializationStatus;
  completionPercentage: number;
  qualificationUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSpecializationSummary {
  totalPoints: number;
  maxPossiblePoints: number;
  overallCompletionPercentage: number;
  completedSpecializations: number;
  totalSpecializations: number;
  primarySpecializationName: string | null;
  secondarySpecializationName: string | null;
}
