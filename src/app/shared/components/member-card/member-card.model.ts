/**
 * One action button on a member card.
 */
export interface MemberCardAction {
  /** Stable key emitted by the card's `action` output. */
  key: string;
  /** Button label. */
  label: string;
  /** LCARS colour class applied alongside `lcars-btn`, e.g. `sunflower`. */
  colourClass: string;
  /** Accessible label, naming the member the button acts on. */
  ariaLabel: string;
}

/**
 * The pill shown above a member card's counts.
 */
export interface MemberCardBadge {
  /** Pill copy, e.g. `Friend`. */
  label: string;
  /** Modifier suffix selecting the pill colour, e.g. `friend`. */
  modifier: string;
}

/**
 * One label/value pair in a member card's counts row.
 */
export interface MemberCardStat {
  /** The label shown above or beside the value. */
  label: string;
  /** The value itself. */
  value: string | number;
}

/**
 * Presentation model for a member card.
 *
 * The registry listings and the friends list both build one of these, so the
 * card itself stays free of any knowledge of which endpoint the member came
 * from or what the viewer may do with them.
 */
export interface MemberCardVm {
  /** Stable identity for list tracking. */
  id: string;
  /** The member's username, shown under their avatar. */
  username: string;
  /** Resolved profile image URL, or null for the placeholder. */
  imageUrl: string | null;
  /**
   * Router link to the member's public record, or null when it cannot be
   * opened — a member who has since made their record private.
   */
  link: string[] | null;
  /** Tooltip explaining why an unlinked member cannot be opened. */
  unlinkedTitle: string | null;
  /** The relationship pill, or null when there is nothing to indicate. */
  badge: MemberCardBadge | null;
  /**
   * Reserves the badge row even when there is no badge, so the rows below line
   * up across a listing where only some cards carry one.
   */
  reserveBadgeSlot: boolean;
  /** The public counts shown in the card's body. */
  stats: MemberCardStat[];
  /** Secondary lines beneath the counts, e.g. `Joined 14 January 2026`. */
  meta: string[];
  /** Action buttons, empty for read-only contexts such as an anonymous visit. */
  actions: MemberCardAction[];
}
