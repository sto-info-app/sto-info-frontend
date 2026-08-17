import { Component, Input } from '@angular/core';

/** Distinguishes one section's content from another's, for `aria-controls`. */
let nextHelpSectionId = 0;

/**
 * A help heading bar and the content beneath it, which the reader can fold
 * away.
 *
 * The help pages are long by nature — an index of every guide, or a guide made
 * of eight sections — and a reader who has found their answer should be able to
 * push the rest out of the way rather than scroll past it.
 *
 * One component rather than the same markup on both pages: the bar carries a
 * button, an icon that swaps, and the ARIA wiring that ties the two together,
 * and three copies of that would eventually disagree about one of them.
 *
 * Sections open expanded. A reader arriving at a guide wants to read it, not
 * to open it first.
 */
@Component({
  selector: 'app-help-section',
  templateUrl: './help-section.component.html',
  standalone: true,
})
export class HelpSectionComponent {
  /** The heading shown in the bar. */
  @Input({ required: true }) heading!: string;

  /** Whether the content is showing. */
  isExpanded = true;

  /** Identifies this section's content for the button that controls it. */
  readonly contentId = `help-section-content-${nextHelpSectionId++}`;

  /**
   * Folds the section away, or opens it again.
   *
   * @returns void
   */
  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }
}
