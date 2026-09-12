/**
 * Sorting and filtering shared by the account lists.
 *
 * Two pages list STO accounts from different sources: the owner's dashboard,
 * whose accounts arrive as their own request and are ordered by the API, and a
 * member's public registry profile, whose accounts arrive embedded in the
 * profile payload and so are ordered here. Their models differ — one has
 * platform and launcher IDs, the other only names — so each page projects its
 * accounts onto the neutral shapes below and the rules themselves live in one
 * place.
 */

/** A field an account list may be ordered by. Mirrors the API's own values. */
export type AccountSortBy =
  'handle' | 'characterCount' | 'endeavourTotalNodes' | 'accountCreatedDate';

/** Direction an account list is ordered in. Mirrors the API's own values. */
export type AccountSortOrder = 'ASC' | 'DESC';

/** The default ordering, matching the API's default. */
export const DEFAULT_ACCOUNT_SORT_BY: AccountSortBy = 'handle';

/** The default direction, matching the API's default. */
export const DEFAULT_ACCOUNT_SORT_ORDER: AccountSortOrder = 'ASC';

/** One option in a Sort by dropdown. */
export interface AccountSortOption {
  value: AccountSortBy;
  label: string;
}

/** One option in a platform or launcher dropdown. */
export interface AccountFilterOption {
  value: string;
  label: string;
}

/** The fields of an account that take part in ordering. */
export interface AccountSortFields {
  handle: string;
  characterCount: number;
  endeavourTotalNodes: number;
  /** ISO date string, or null when the owner recorded none. */
  accountCreatedDate: string | null;
  pinned: boolean;
}

/** The fields of an account that take part in filtering. */
export interface AccountFilterFields {
  /**
   * Everything the free-text search matches against, already lower-cased and
   * joined, so a keystroke does not rebuild it per account.
   */
  searchHaystack: string;
  /**
   * Identifies the platform for filtering. The dashboard supplies the platform
   * ID, the registry the platform name, since that is all it is told.
   */
  platformKey: string | null;
  /** Identifies the launcher for filtering. See {@link platformKey}. */
  launcherKey: string | null;
  lifetimeSubscription: boolean;
  pinned: boolean;
}

/** The filters a viewer has applied to an account list. */
export interface AccountFilters {
  searchText: string;
  /** A platform key, or an empty string for all platforms. */
  platformKey: string;
  /** A launcher key, or an empty string for all launchers. */
  launcherKey: string;
  lifetimeOnly: boolean;
  pinnedOnly: boolean;
}

/** Filters that hide nothing, and the state the controls reset to. */
export const NO_ACCOUNT_FILTERS: AccountFilters = {
  searchText: '',
  platformKey: '',
  launcherKey: '',
  lifetimeOnly: false,
  pinnedOnly: false,
};

/**
 * Builds the lower-cased haystack the free-text search matches against.
 *
 * @param values - The values to search over. Empty and absent ones are ignored.
 * @returns A single lower-cased string.
 */
export function buildAccountSearchHaystack(
  values: (string | null | undefined)[],
): string {
  return values
    .filter((value): value is string => !!value?.trim())
    .join(' ')
    .toLowerCase();
}

/**
 * Builds the options for a platform or launcher dropdown from the values
 * actually present in a list, for a context that is given names rather than a
 * lookup table to draw on.
 *
 * @param values - One value per account. Absent and blank ones are ignored.
 * @returns Unique options, ordered by label.
 */
export function buildAccountFilterOptions(
  values: (string | null | undefined)[],
): AccountFilterOption[] {
  const unique = new Set(
    values.filter((value): value is string => !!value?.trim()),
  );

  return [...unique]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(value => ({ value, label: value }));
}

/**
 * Reports whether an account survives the applied filters.
 *
 * @param fields - The account's filterable fields.
 * @param filters - The filters the viewer has applied.
 * @returns True when the account should be shown.
 */
export function matchesAccountFilters(
  fields: AccountFilterFields,
  filters: AccountFilters,
): boolean {
  const search = filters.searchText.trim().toLowerCase();
  if (search && !fields.searchHaystack.includes(search)) {
    return false;
  }

  if (filters.platformKey && fields.platformKey !== filters.platformKey) {
    return false;
  }

  if (filters.launcherKey && fields.launcherKey !== filters.launcherKey) {
    return false;
  }

  if (filters.lifetimeOnly && !fields.lifetimeSubscription) {
    return false;
  }

  return !(filters.pinnedOnly && !fields.pinned);
}

/**
 * Counts how many filters are narrowing the list, so the page can offer to
 * clear them only when there is something to clear.
 *
 * @param filters - The filters the viewer has applied.
 * @returns The number of active filters.
 */
export function countActiveAccountFilters(filters: AccountFilters): number {
  return [
    !!filters.searchText.trim(),
    !!filters.platformKey,
    !!filters.launcherKey,
    filters.lifetimeOnly,
    filters.pinnedOnly,
  ].filter(Boolean).length;
}

/**
 * Compares two handles case-insensitively.
 *
 * @param a - The first account.
 * @param b - The second account.
 * @returns A negative number, zero, or a positive number.
 */
function compareHandles(a: AccountSortFields, b: AccountSortFields): number {
  return a.handle.localeCompare(b.handle, undefined, { sensitivity: 'base' });
}

/**
 * Compares two accounts by their recorded STO account creation date.
 *
 * Accounts with no recorded date sort last in both directions: the date is
 * optional, and reversing the order should not promote the accounts that are
 * missing it to the top.
 *
 * @param a - The first account.
 * @param b - The second account.
 * @param direction - `1` ascending, `-1` descending.
 * @returns A negative number, zero, or a positive number.
 */
function compareCreatedDates(
  a: AccountSortFields,
  b: AccountSortFields,
  direction: number,
): number {
  const aDate = a.accountCreatedDate;
  const bDate = b.accountCreatedDate;

  if (!aDate || !bDate) {
    if (!aDate && !bDate) {
      return 0;
    }

    return aDate ? -1 : 1;
  }

  return direction * (Date.parse(aDate) - Date.parse(bDate));
}

/**
 * Compares two accounts by the requested field.
 *
 * @param a - The first account.
 * @param b - The second account.
 * @param sortBy - The field to compare.
 * @param direction - `1` ascending, `-1` descending.
 * @returns A negative number, zero, or a positive number.
 */
function compareField(
  a: AccountSortFields,
  b: AccountSortFields,
  sortBy: AccountSortBy,
  direction: number,
): number {
  switch (sortBy) {
    case 'characterCount':
      return direction * (a.characterCount - b.characterCount);
    case 'endeavourTotalNodes':
      return direction * (a.endeavourTotalNodes - b.endeavourTotalNodes);
    case 'accountCreatedDate':
      return compareCreatedDates(a, b, direction);
    default:
      return direction * compareHandles(a, b);
  }
}

/**
 * Orders accounts the way the API does: pinned first, then by the requested
 * field, then by handle so the result is total and does not shift between
 * identical renders.
 *
 * @param accounts - The accounts to order, projected onto their sort fields.
 * @param sortBy - The field to order by.
 * @param sortOrder - The direction to order in.
 * @returns A new, ordered array. The input is not modified.
 */
export function sortAccounts<T extends AccountSortFields>(
  accounts: readonly T[],
  sortBy: AccountSortBy = DEFAULT_ACCOUNT_SORT_BY,
  sortOrder: AccountSortOrder = DEFAULT_ACCOUNT_SORT_ORDER,
): T[] {
  const direction = sortOrder === 'DESC' ? -1 : 1;

  return [...accounts].sort((a, b) => {
    const byPinned = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (byPinned !== 0) {
      return byPinned;
    }

    const byField = compareField(a, b, sortBy, direction);
    if (byField !== 0) {
      return byField;
    }

    return compareHandles(a, b);
  });
}
