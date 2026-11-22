import { NgClass } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';

import { SectionFoldService } from 'src/app/shared/services/section-fold.service';

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
 * open it first. What a reader folds stays folded on their next visit to the
 * page, and folded content is hidden rather than taken out of the page, so a
 * form part way through keeps what was typed into it.
 *
 * A host that needs a control of its own on the bar - an edit pen beside the
 * caret - marks it `sectionActions`, and it is laid in the bar's actions group
 * ahead of the caret.
 */
@Component({
  selector: 'app-collapsible-section',
  templateUrl: './collapsible-section.component.html',
  standalone: true,
  imports: [NgClass],
})
export class CollapsibleSectionComponent implements OnInit {
  private readonly _folds = inject(SectionFoldService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The heading shown in the bar. */
  @Input({ required: true }) heading!: string;

  /**
   * Classes for the bar itself, for a page that spaces its bars its own way —
   * `small-lcars-bar-gap` where several sections sit one under another.
   */
  @Input() barClass = '';

  /**
   * A count or short mark beside the heading, in the bar's round badge — the
   * open reports in a queue, the overrides on a member. Null draws none.
   */
  @Input() badge: string | number | null = null;

  /**
   * Names the section among the others on its page, for remembering whether
   * it was folded. The heading does unless two sections on a page share one,
   * or the heading changes with what the page shows.
   */
  @Input() sectionKey = '';

  /** Whether the content is showing. */
  isExpanded = true;

  /** Identifies this section's content for the button that controls it. */
  readonly contentId = `collapsible-section-content-${nextCollapsibleSectionId}`;

  /** Identifies this section's heading, which names its region. */
  readonly headingId = `collapsible-section-heading-${nextCollapsibleSectionId++}`;

  /**
   * Opens the section as the reader last left it on this page.
   */
  ngOnInit(): void {
    this.isExpanded = !this._folds.isFolded(this.key());
  }

  /**
   * Folds the section away, or opens it again, and remembers which.
   *
   * @returns void
   */
  toggle(): void {
    this.isExpanded = !this.isExpanded;
    this._folds.setFolded(this.key(), !this.isExpanded);
  }

  /**
   * Opens the section if it is folded, for a link that leads to something
   * inside it, and remembers it open. Called from outside the section, so it
   * marks the section to be drawn again itself.
   */
  reveal(): void {
    if (!this.isExpanded) {
      this.toggle();
      this._cdr.markForCheck();
    }
  }

  /**
   * Names the section for the folds remembered on its page.
   *
   * @returns The section key, or the heading when it has none.
   */
  private key(): string {
    return this.sectionKey || this.heading;
  }
}
