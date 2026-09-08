/**
 * One icon-prefixed detail row rendered in an account card's body.
 */
export interface AccountCardDetail {
  /** Font Awesome class, e.g. `fas fa-user`. */
  icon: string;
  /** The value to display. */
  text: string;
  /** Optional label describing the value. */
  label?: string;
  /**
   * Renders the label visibly above the value instead of exposing it only to
   * screen readers. Use when the icon alone does not make the value's meaning
   * obvious.
   */
  showLabel?: boolean;
  /**
   * Visual weight. `primary` is the default; `secondary` is dimmer; `muted` is
   * dimmest and clamps to three lines for long free text such as notes.
   */
  variant?: 'primary' | 'secondary' | 'muted';
  /** Whether this detail is obscured while Privacy Mode is enabled. */
  private?: boolean;
}

/**
 * The endeavour badge shown on an account card, when the viewer may see it.
 */
export interface AccountCardEndeavour {
  totalNodes: number;
  link: string | string[];
}

/**
 * One action button on an account card.
 */
export interface AccountCardAction {
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
 * Presentation model for an STO account card.
 *
 * Both the owner-facing dashboard and the public registry build one of these,
 * so the card itself stays free of any knowledge of where the data came from.
 */
export interface AccountCardVm {
  /** Stable identity for list tracking. */
  id: string;
  /** The account handle shown in the card header. */
  handle: string;
  /** Router link for the card and its header. */
  link: string | string[];
  /** Platform and launcher theme classes, space-separated. */
  themeClass: string;
  /** Resolved background image for the card body. */
  bgImagePath: string;
  /** Whether to show the lifetime-subscription badge. */
  lifetimeSubscription: boolean;
  /** Number of captains shown in the header count. */
  characterCount: number;
  /**
   * Screen-reader description of the platform, which is otherwise conveyed
   * only by the card's colour. Pass null when the platform is already shown as
   * a visible detail row.
   */
  platformName: string | null;
  /** Screen-reader description of the launcher. Same rules as `platformName`. */
  launcherName: string | null;
  /** Icon-prefixed detail rows for the card body. */
  details: AccountCardDetail[];
  /** Endeavour badge, or null to omit the column. */
  endeavour: AccountCardEndeavour | null;
  /** Action buttons, empty for read-only contexts such as the registry. */
  actions: AccountCardAction[];
}
