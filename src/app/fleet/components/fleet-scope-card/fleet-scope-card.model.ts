import { FleetScopeType } from 'src/app/fleet/constants/fleet-scope.constants';

/**
 * One action button on a Fleet scope card.
 */
export interface FleetScopeCardAction {
  /** Stable key emitted by the card's `action` output. */
  key: string;

  /** Button label. */
  label: string;

  /**
   * LCARS colour class applied alongside `lcars-btn`: `green` for an action
   * that joins or applies, `red` for one that leaves or removes, and empty to
   * take the card's own colour.
   */
  colourClass: string;

  /**
   * Accessible label, naming the Fleet the button acts on.
   *
   * A directory page shows a column of cards whose buttons all read "Apply",
   * so the label is the only thing that says which Fleet is being applied to.
   */
  ariaLabel: string;
}

/**
 * The state pill on a Fleet scope card.
 *
 * Its own field rather than a colour on the card, because the card's colour
 * says what feature this is and the pill says what state the Fleet is in.
 */
export interface FleetScopeCardStatus {
  /** Pill copy, e.g. `Recruiting`. */
  label: string;

  /** Modifier suffix selecting the pill colour, e.g. `recruiting`. */
  modifier: string;
}

/**
 * The square emblem drawn at the head of a card.
 *
 * A resolved URL rather than the reference the server sends, so the card has
 * nothing to know about where images are kept. The description arrives with it
 * rather than beside it: an emblem whose alternative text came from a second
 * request would render without one for as long as that request took.
 */
/**
 * A detail a page adds to a card, set out label over value after the ones
 * every card carries: when a Captain joined a Fleet, say, on their own page.
 */
export interface FleetScopeCardDetail {
  label: string;

  value: string;
}

export interface FleetScopeCardEmblem {
  /** Where to fetch the picture from. */
  url: string;

  /** What the picture shows. Empty when nobody said, which is valid markup. */
  alt: string;
}

/**
 * The Armada line on a Fleet card (FC-056): the Armada's name, where it
 * opens, and the Fleet's position in it, as the reader says it.
 */
export interface FleetScopeCardArmada {
  /** The Armada's exact name. */
  name: string;

  /** Where the Armada opens, or null to show its name alone. */
  link: string[] | null;

  /** Alpha, Beta or Gamma. */
  position: string;
}

/**
 * Presentation model for a Fleet, Community or Armada card.
 *
 * The directory, a Community's own page and the Armada listings all build one
 * of these, so the card stays free of any knowledge of which endpoint the
 * record came from or what the viewer is entitled to do with it.
 *
 * **Every field is text the card renders as text.** A Fleet name comes from a
 * CSV somebody uploaded, so nothing here may reach a component that renders
 * HTML.
 */
export interface FleetScopeCardVm {
  /** Stable identity for list tracking. */
  id: string;

  /** Which level of the hierarchy this card is. */
  scope: FleetScopeType;

  /**
   * The scope's emblem, or null when it has none.
   *
   * The emblem and not the banner. A card is a row in a list and the emblem is
   * what a list draws; a banner is five times as wide as it is tall and
   * belongs across the top of the scope's own page.
   */
  emblem: FleetScopeCardEmblem | null;

  /**
   * The exact name, as recorded.
   *
   * Never tidied for display: two Fleets whose names differ only by their
   * spacing are two different Fleets, and a directory that smooths that over
   * is a directory in which one of them cannot be found.
   */
  name: string;

  /**
   * The Community this sits in, or null for a Community card.
   *
   * Shown because the same Fleet name may be registered by more than one
   * Community, and the parent is what tells the two apart.
   */
  communityName: string | null;

  /**
   * Where the Community opens, where the reader may follow it there; null
   * shows its name alone.
   */
  communityLink?: string[] | null;

  /**
   * The Armada a Fleet sits in and where, under the Community line; null
   * for a Fleet in none, and for any card that is not a Fleet's.
   */
  armada?: FleetScopeCardArmada | null;

  /** The platform, or null for a Community, which spans all of them. */
  platform: string | null;

  /** Router link to the record, or null when the viewer cannot open it. */
  link: string[] | null;

  /** Tooltip explaining why an unlinked card cannot be opened. */
  unlinkedTitle: string | null;

  /** The state pill, or null when there is nothing to say about state. */
  status: FleetScopeCardStatus | null;

  /**
   * How fresh a Fleet's roster is, the value under the card's "Roster"
   * label, already written out; null where a record has no roster.
   *
   * A formatted string rather than a date, because deciding which timezone a
   * moment is written in belongs to the page, which knows whether it holds an
   * instant or a day somebody typed.
   */
  roster: string | null;

  /** Details of the page's own, after the shared ones; none by default. */
  details?: readonly FleetScopeCardDetail[];

  /** Lines beneath the details, e.g. a description or a duplicate note. */
  meta: string[];

  /** Action buttons; empty for a read-only context such as an anonymous visit. */
  actions: FleetScopeCardAction[];
}
