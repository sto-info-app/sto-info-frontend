/**
 * One action button on a character card.
 */
export interface CharacterCardAction {
  /** Stable key emitted by the card's `action` output. */
  key: string;
  /** Font Awesome class, e.g. `fas fa-user-pen`. */
  icon: string;
  /** Tooltip and accessible label. */
  title: string;
  /** Renders the button in the destructive style. */
  destructive?: boolean;
}

/**
 * Presentation model for a captain card.
 *
 * Both the owner-facing account detail page and the public registry build one
 * of these, so the card itself stays free of any knowledge of where the data
 * came from.
 */
export interface CharacterCardVm {
  /** Stable identity for list tracking. */
  id: string;
  /** The captain handle shown in the card header. */
  handle: string;
  /** The captain's level, or null when not recorded. */
  level: number | null;
  /** Router link for the card. */
  link: string | string[];
  /** General-faction theme class for the card border and background. */
  factionClass: string;
  /** Career-class theme class for the header row. */
  classCategory: string;
  /** Font Awesome icon name for the captain's sex. */
  sexIcon: string;
  /** Resolved profile image URL. */
  imageUrl: string | null;
  /** The captain's species name. */
  speciesName: string | null;
  /** The captain's rank title. */
  rankTitle: string | null;
  /** The captain's rank icon. */
  rankIconUrl: string | null;
  /** The captain's starting faction name. */
  factionName: string | null;
  /** The captain's starting faction icon, used as a watermark. */
  factionIconUrl: string | null;
  /** The captain's recruit type name. */
  recruitTypeName: string | null;
  /** The captain's recruit type icon. */
  recruitTypeIconUrl: string | null;
  /** Action buttons, empty for read-only contexts such as the registry. */
  actions: CharacterCardAction[];
}
