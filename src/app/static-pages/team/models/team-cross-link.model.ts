/** The button on one team list page that leads to the other list. */
export interface TeamCrossLink {
  /** Router link to the other list page. */
  link: string;
  /** The other list's route title, shown on the button. */
  label: string;
}
