/**
 * The account-and-captain list the quick switcher jumps between.
 *
 * Deliberately narrower than `StoAccount` and `Character`: the switcher draws
 * a row and then navigates away from it, so the API sends only the fields a
 * row shows. Anything a page needs after the jump is loaded by that page.
 */

/** One captain in the quick-switch list. */
export interface SwitcherCharacter {
  id: string;
  /** Also how the captain is addressed in the URL. */
  handle: string;
  /** The captain's avatar at 100px, or null when they have none. */
  profilePicture100: string | null;
  factionName: string | null;
  factionIconUrl: string | null;
  /** Drives the row's faction colour. */
  generalFactionName: string | null;
  /** When the owner pinned this captain, or null when not pinned. */
  pinnedAt: string | null;
}

/** One account, with its captains, in the quick-switch list. */
export interface SwitcherAccount {
  id: string;
  /** Also how the account is addressed in the URL, once encoded. */
  handle: string;
  /** Drives the row's platform colour. */
  platformName: string | null;
  /** Refines a PC account's colour. */
  launcherName: string | null;
  lifetimeSubscription: boolean;
  /** When the owner pinned this account, or null when not pinned. */
  pinnedAt: string | null;
  /**
   * The account's captains, pinned first and then by handle. Empty for an
   * account with no captains yet, which the list still offers: it is somewhere
   * to switch to, and hiding it would hide an account from its own owner.
   */
  characters: SwitcherCharacter[];
}
