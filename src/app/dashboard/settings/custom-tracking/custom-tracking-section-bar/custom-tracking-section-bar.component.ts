import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * The LCARS heading bar of one Custom Tracking section.
 *
 * The same bar the rest of the site folds a section away with — a label on the
 * left, a caret on the right — rather than a panel chrome of this feature's
 * own. A reader who has learnt what the caret does on the help guides and the
 * Storytime pages should not have to learn a second control here.
 *
 * One component for both places a section is listed: the builder and the value
 * editor. In both it carries the name and the caret, and anything else a
 * caller needs on it is projected in rather than built here, because what a
 * section can be asked to do differs between the two and where those controls
 * sit does not.
 *
 * What the bar says about a section it says in words as well as in colour: a
 * section is labelled public or private either way, so silence never has to be
 * read as one of them. Where the panel beneath already states it, the bar is
 * told nothing and says nothing, rather than repeating it a line apart.
 */
@Component({
  selector: 'app-custom-tracking-section-bar',
  templateUrl: './custom-tracking-section-bar.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTrackingSectionBarComponent {
  /** What the section is called. */
  @Input({ required: true }) name!: string;

  /** What the section holds, in words, or null where nothing is counted. */
  @Input() summary: string | null = null;

  /**
   * Whether its owner has asked for it to be public, or null to say nothing.
   *
   * Null where something inside the panel already says it — the builder states
   * a section's visibility on the info panel just under this bar, and saying
   * it twice a line apart is one statement too many.
   */
  @Input() publiclyVisible: boolean | null = null;

  /** Whether a moderator has hidden it. */
  @Input() suppressed = false;

  /** Whether what is inside is showing. */
  @Input() isExpanded = false;

  /** What the caret opens and closes, for `aria-controls`. */
  @Input({ required: true }) contentId!: string;

  /** Raised when the section should open or fold away. */
  @Output() readonly toggled = new EventEmitter<void>();

  /**
   * What the caret does, named for the pointer and the screen reader alike.
   *
   * The section is named as well as the action, because a page holding ten
   * bars announces ten identical "Collapse" buttons otherwise.
   *
   * @returns The label for the caret button.
   */
  get toggleLabel(): string {
    return `${this.isExpanded ? 'Collapse' : 'Expand'} ${this.name}`;
  }
}
