import { FleetScopeType } from 'src/app/fleet/constants/fleet-scope.constants';

/**
 * One action button on a Fleet scope card.
 */
export interface FleetScopeCardAction {
  /** Stable key emitted by the card's `action` output. */
  key: string;

  /** Button label. */
  label: string;

  /** LCARS colour class applied alongside `lcars-btn`, e.g. `sky`. */
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
export interface FleetScopeCardEmblem {
  /** Where to fetch the picture from. */
  url: string;

  /** What the picture shows. Empty when nobody said, which is valid markup. */
  alt: string;
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

  /** The platform, or null for a Community, which spans all of them. */
  platform: string | null;

  /** Router link to the record, or null when the viewer cannot open it. */
  link: string[] | null;

  /** Tooltip explaining why an unlinked card cannot be opened. */
  unlinkedTitle: string | null;

  /** The state pill, or null when there is nothing to say about state. */
  status: FleetScopeCardStatus | null;

  /**
   * When this record was last observed, already written out.
   *
   * A formatted string rather than a date, because deciding which timezone a
   * moment is written in belongs to the page, which knows whether it holds an
   * instant or a day somebody typed.
   */
  lastObservedLabel: string | null;

  /** Secondary lines beneath the name, e.g. member counts. */
  meta: string[];

  /** Action buttons; empty for a read-only context such as an anonymous visit. */
  actions: FleetScopeCardAction[];
}
