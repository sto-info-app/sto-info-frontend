/**
 * One action button on a member card.
 */
export interface MemberCardAction {
  /** Stable key emitted by the card's `action` output. */
  key: string;

  /** Button label. */
  label: string;

  /** LCARS colour class applied alongside `lcars-btn`, e.g. `green`. */
  colourClass: string;

  /**
   * Accessible label, naming the member the button acts on.
   *
   * A listing shows a column of cards whose buttons all read "Block", so the
   * label is the only thing that says who is being blocked.
   */
  ariaLabel: string;
}

/**
 * The relationship pill at the end of a card's heading block.
 */
export interface MemberCardBadge {
  /** Pill copy, e.g. `Friend`. */
  label: string;

  /** Modifier suffix selecting the pill colour, e.g. `friend`. */
  modifier: string;
}

/**
 * One detail set out label beside value: a count, or a date.
 */
export interface MemberCardDetail {
  label: string;

  /** Already written out, so the card decides nothing about dates. */
  value: string;
}

/**
 * Presentation model for a member card.
 *
 * The registry and the friends list both build one of these, so the card
 * stays free of any knowledge of which endpoint the member came from or what
 * the viewer is entitled to do with them.
 */
export interface MemberCardVm {
  /** Stable identity for list tracking. */
  id: string;

  /** The username, exactly as recorded: its case is part of it. */
  username: string;

  /** The avatar, or null for the placeholder. */
  imageUrl: string | null;

  /** Router link to the record, or null when the viewer cannot open it. */
  link: string[] | null;

  /** Tooltip explaining why an unlinked card cannot be opened. */
  unlinkedTitle: string | null;

  /** The relationship pill, or null when there is nothing to say. */
  badge: MemberCardBadge | null;

  /**
   * Whether the member has STO Info open now, as far as the viewer may know
   * (FC-034): a green dot beside the name. False for anybody the viewer may
   * not see, which tells nothing of their choice.
   */
  online: boolean;

  /** What the member has done on STO Info: joined, last seen, friends since. */
  siteDetails: MemberCardDetail[];

  /** What they have in the game: accounts, Captains, playing since. */
  gameDetails: MemberCardDetail[];

  /** Action buttons; empty for a read-only context such as an anonymous visit. */
  actions: MemberCardAction[];
}
