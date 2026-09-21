import { FleetScopeCardVm } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FleetDirectorySort } from 'src/app/models/fleet.models';

/** One page of a listing, already turned into cards. */
export interface FleetDirectoryResults {
  /** The cards to draw, in the order the server returned them. */
  cards: FleetScopeCardVm[];

  /** How many records match, across every page. */
  total: number;

  /** Which page this is, counting from one. */
  page: number;

  /** How many records a page holds. */
  pageSize: number;
}

/**
 * What a listing can currently show.
 *
 * A discriminated union rather than three flags, because two of them being
 * true at once is the bug this shape makes unrepresentable: a stale list left
 * on screen beneath an error message reads as a list that is still true.
 */
export type FleetDirectoryState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR'; readonly message: string }
  | { readonly kind: 'READY'; readonly results: FleetDirectoryResults };

/** One choice in the ordering control. */
export interface FleetDirectorySortOption {
  /** The value sent to the server. */
  value: FleetDirectorySort;

  /** What the reader picks. */
  label: string;
}

/**
 * The orderings every listing offers.
 *
 * Name first, and not only because it is familiar: two records for one
 * in-game Fleet fold to the same name, so ordering by it puts them next to
 * each other. A duplicate-aware directory that scattered duplicates across
 * four pages would answer the third acceptance criterion in form and fail it
 * in practice.
 */
export const FLEET_SORTS_WITHOUT_FRESHNESS: readonly FleetDirectorySortOption[] =
  [
    { value: FleetDirectorySort.NAME, label: 'Name' },
    { value: FleetDirectorySort.NEWEST, label: 'Newest first' },
  ];

/**
 * The orderings the Fleet listing offers.
 *
 * Freshness is here and nowhere else. Nothing observes a Community or an
 * Armada, so neither has a roster import to be fresh, and the server answers
 * `400` rather than quietly ordering by something else.
 */
export const FLEET_SORTS_WITH_FRESHNESS: readonly FleetDirectorySortOption[] = [
  ...FLEET_SORTS_WITHOUT_FRESHNESS,
  { value: FleetDirectorySort.FRESHNESS, label: 'Most recently imported' },
];
