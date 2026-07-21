export type CharacterRdStatus = 'not_started' | 'in_progress' | 'complete';

/** The maximum level a character can attain in an R&D school. */
export const RD_MAX_LEVEL = 20;

/**
 * STO item-rarity slugs. Match the `.rarity-<slug>` / `--sto-rarity-<slug>`
 * utilities defined in the core `sto-rarity-colours.scss` stylesheet.
 */
export type StoRarity =
  'common' | 'uncommon' | 'rare' | 'very-rare' | 'ultra-rare';

/** The rarity of items a school can craft before reaching any milestone. */
export const RD_BASE_RARITY: StoRarity = 'common';

/**
 * Quality grades unlocked as an R&D school levels up. Reaching each milestone
 * level lets the school fabricate items up to that rarity. Colours come from the
 * core STO rarity palette via each rarity's slug.
 */
export const RD_QUALITY_MILESTONES: {
  level: number;
  quality: string;
  rarity: StoRarity;
}[] = [
  { level: 5, quality: 'Uncommon', rarity: 'uncommon' },
  { level: 10, quality: 'Rare', rarity: 'rare' },
  { level: 15, quality: 'Very Rare', rarity: 'very-rare' },
  { level: 20, quality: 'Ultra Rare', rarity: 'ultra-rare' },
];

export interface CharacterRdSchool {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  accentColor: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterRdProgress {
  id: string;
  characterId: string;
  schoolId: string;
  school: CharacterRdSchool;
  currentLevel: number;
  status: CharacterRdStatus;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterRdSummary {
  totalLevels: number;
  maxPossibleLevels: number;
  overallCompletionPercentage: number;
  completedSchools: number;
  totalSchools: number;
}
