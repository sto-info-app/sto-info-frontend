import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Distinguishes one section's content from another's, for `aria-controls`. */
let nextCollapsibleSectionId = 0;

/**
 * An LCARS heading bar and the content beneath it, which the reader can fold
 * away.
 *
 * Long pages are built from these — an index of every help guide, a guide made
 * of eight sections, the Storytime landing page and its five — and a reader who
 * has found what they came for should be able to push the rest out of the way
 * rather than scroll past it.
 *
 * One component rather than the same markup on every page: the bar carries a
 * button, an icon that swaps, and the ARIA wiring that ties the two together,
 * and copies of that would eventually disagree about one of them.
 *
 * Sections open expanded. A reader arriving at a page wants to read it, not to
 * open it first.
 */
@Component({
  selector: 'app-collapsible-section',
  templateUrl: './collapsible-section.component.html',
  standalone: true,
  imports: [NgClass],
})
export class CollapsibleSectionComponent {
  /** The heading shown in the bar. */
  @Input({ required: true }) heading!: string;

  /**
   * Classes for the bar itself, for a page that spaces its bars its own way —
   * `small-lcars-bar-gap` where several sections sit one under another.
   */
  @Input() barClass = '';

  /** Whether the content is showing. */
  isExpanded = true;

  /** Identifies this section's content for the button that controls it. */
  readonly contentId = `collapsible-section-content-${nextCollapsibleSectionId++}`;

  /**
   * Folds the section away, or opens it again.
   *
   * @returns void
   */
  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }
}
