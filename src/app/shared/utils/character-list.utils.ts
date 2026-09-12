/**
 * Ordering and pin filtering for an account's captain list.
 *
 * The API orders the owner's captain list, so nothing here re-sorts it; these
 * are the values the page sends and the labels it offers, kept beside the
 * account list's own helpers rather than buried in the page that uses them.
 */

/** A field a captain list may be ordered by. Mirrors the API's own values. */
export type CharacterSortBy =
  'handle' | 'level' | 'createdDate' | 'species' | 'faction' | 'class';

/** Direction a captain list is ordered in. Mirrors the API's own values. */
export type CharacterSortOrder = 'ASC' | 'DESC';

/** The default ordering, matching the API's default. */
export const DEFAULT_CHARACTER_SORT_BY: CharacterSortBy = 'handle';

/** The default direction, matching the API's default. */
export const DEFAULT_CHARACTER_SORT_ORDER: CharacterSortOrder = 'ASC';

/** One option in a captain Sort by dropdown. */
export interface CharacterSortOption {
  value: CharacterSortBy;
  label: string;
}

/**
 * The orderings offered for a captain list.
 *
 * The values are the API's own, so they are sent to it unchanged.
 */
export const CHARACTER_SORT_OPTIONS: readonly CharacterSortOption[] = [
  { value: 'handle', label: 'Captain Name' },
  { value: 'level', label: 'Level' },
  { value: 'createdDate', label: 'Created Date' },
  { value: 'species', label: 'Species' },
  { value: 'faction', label: 'Faction' },
  { value: 'class', label: 'Class' },
];
