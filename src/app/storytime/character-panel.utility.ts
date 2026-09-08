import { Character } from 'src/app/models/storytime.models';

/** One recorded fact about a Character, as a cast panel shows it. */
export interface CharacterFact {
  /** What the fact is. */
  label: string;

  /** What was recorded for it. */
  value: string;

  /** The Font Awesome classes that stand in for the label. */
  icon: string;
}

/** A Character as a cast panel renders them. */
export interface CharacterPanelVm<TCharacter extends Character = Character> {
  /** The Character the panel is about. */
  character: TCharacter;

  /** Their rank, when one is recorded. */
  rank: string | null;

  /** The rest of what is recorded about them, in a fixed order. */
  facts: CharacterFact[];

  /** Their traits, never null, so the template has a list to walk. */
  traits: string[];

  /** Whether anything at all has been recorded beyond their name. */
  hasDetails: boolean;
}

/** A fact before it is known whether the Character has one. */
interface CandidateFact {
  label: string;
  value: string | null;
  icon: string;
}

// The icon for each fact, so the same thing is drawn for a species wherever a
// Character is listed. A captain card carries its rank and species as rows of
// their own with an icon each; these are the Storytime equivalents, for fields
// the game's own captains do not have.
const FACT_ICONS = {
  species: 'fa-solid fa-dna',
  faction: 'fa-solid fa-flag',
  occupation: 'fa-solid fa-briefcase',
  affiliation: 'fa-solid fa-people-group',
  ship: 'fa-solid fa-rocket',
};

/**
 * Builds what a cast panel shows about one Character.
 *
 * Only the fields that have been filled in are returned, in the order the
 * Character's own page lists them, so the two read the same way round. A
 * Character with nothing but a name shows nothing rather than a column of
 * blank labels.
 *
 * The rank comes back on its own rather than as one of the facts: it is the
 * headline of the panel, the way it is on a captain card.
 *
 * @param character - The Character to describe.
 * @returns The panel's view of them.
 */
export function buildCharacterPanelVm<TCharacter extends Character>(
  character: TCharacter,
): CharacterPanelVm<TCharacter> {
  const candidates: CandidateFact[] = [
    {
      label: 'Species',
      value: character.species,
      icon: FACT_ICONS.species,
    },
    {
      label: 'Faction',
      value: character.faction,
      icon: FACT_ICONS.faction,
    },
    {
      label: 'Occupation',
      value: character.occupation,
      icon: FACT_ICONS.occupation,
    },
    {
      label: 'Affiliation',
      value: character.affiliation,
      icon: FACT_ICONS.affiliation,
    },
    {
      label: 'Ship',
      value: character.shipAssignment,
      icon: FACT_ICONS.ship,
    },
  ];

  const facts = candidates.filter(
    (fact): fact is CharacterFact =>
      fact.value !== null && fact.value !== undefined && fact.value.length > 0,
  );

  const rank =
    character.rank && character.rank.length > 0 ? character.rank : null;
  const traits = character.traits ?? [];

  return {
    character,
    rank,
    facts,
    traits,
    hasDetails:
      rank !== null ||
      facts.length > 0 ||
      traits.length > 0 ||
      (character.shortBio ?? '').length > 0,
  };
}
