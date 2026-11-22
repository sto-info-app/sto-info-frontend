/**
 * One tab in a Fleet page's strip.
 *
 * Every Fleet section is its own route — `/fleets/{community}`, its roster, its
 * history, its news — so a tab is a link rather than a button, which is what
 * keeps a section bookmarkable and the back button honest.
 */
export interface FleetShellTab {
  /** Router link for the section. */
  link: string;

  /** Short label shown on the tab. Kept short so the strip stays shallow. */
  label: string;

  /**
   * Whether the tab lights only on an exact URL match.
   *
   * Set for an overview tab whose route is the prefix of every other tab in
   * the same strip; leave unset for a tab that should stay lit while the
   * reader drills into a page beneath it.
   */
  exact: boolean;

  /**
   * The pages the tab lights on, by path, when its link's prefix is the
   * wrong test (FC-044). A Fleet's address runs through its Community's, so
   * the directory strip would otherwise light Communities on every Fleet and
   * Armada page. Given, it decides alone and `exact` is ignored.
   */
  lightsOn?: RegExp;
}
