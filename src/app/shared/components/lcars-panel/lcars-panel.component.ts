import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';

import { SectionFoldService } from 'src/app/shared/services/section-fold.service';

/** The LCARS colours a panel may be drawn in, by name. */
export type LcarsPanelAccent =
  | 'sunflower'
  | 'perano'
  | 'orange'
  | 'sky'
  | 'gold'
  | 'bluey'
  | 'tangerine'
  | 'cool';

/** Distinguishes one panel's name from another's, for `aria-labelledby`. */
let nextLcarsPanelId = 0;

/**
 * A block of a page drawn as an LCARS panel card: a coloured spine down its
 * left, a solid block across its top carrying its name, and a tinted body.
 *
 * Since 12 October 2026 this one shape, the one the dashboard and Storytime
 * already draw their cards in, has replaced the bare dark boxes a page used
 * to put a block in — a follow box, a filter box, a list of alerts.
 *
 * Its colour comes from the page's rotation (`--lcars-accent`), so a run of
 * panels varies by itself; `accent` names one where a panel must keep a colour
 * of its own. Marks for the heading block — a count, a state — are projected
 * with `panelMarks`.
 *
 * A `collapsible` panel - a search or a set of filters - carries a caret on
 * its heading block and folds its body away, remembered per page as a
 * collapsible section's fold is, and hidden rather than removed, so a search
 * part way through keeps what was typed.
 */
@Component({
  selector: 'app-lcars-panel',
  templateUrl: './lcars-panel.component.html',
  styleUrls: ['./lcars-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "accent() ? 'accent-' + accent() : ''" },
})
export class LcarsPanelComponent implements OnInit {
  private readonly _folds = inject(SectionFoldService);

  /** The panel's name, on its heading block. */
  readonly heading = input.required<string>();

  /** The heading's level in the page's outline. */
  readonly level = input<2 | 3 | 4>(3);

  /** A colour of the panel's own, in place of the page's rotation. */
  readonly accent = input<LcarsPanelAccent | null>(null);

  /** Whether the reader may fold the panel's body away. */
  readonly collapsible = input(false);

  /**
   * Names the panel among the others on its page, for remembering whether it
   * was folded. The heading does unless two panels on a page share one.
   */
  readonly panelKey = input('');

  /** Whether the body is shown. */
  readonly isExpanded = signal(true);

  /** Identifies the panel's body for the caret that folds it. */
  readonly bodyId = `lcars-panel-body-${nextLcarsPanelId}`;

  /** Identifies the panel's name for the region it labels. */
  readonly headingId = `lcars-panel-heading-${nextLcarsPanelId++}`;

  /** Opens the panel as the reader last left it on this page. */
  ngOnInit(): void {
    if (this.collapsible()) {
      this.isExpanded.set(!this._folds.isFolded(this.foldKey()));
    }
  }

  /** Folds the body away, or opens it again, and remembers which. */
  toggle(): void {
    this.isExpanded.update(expanded => !expanded);
    this._folds.setFolded(this.foldKey(), !this.isExpanded());
  }

  /**
   * The panel's name among the page's folds, apart from any section's of the
   * same heading.
   */
  private foldKey(): string {
    return `panel:${this.panelKey() || this.heading()}`;
  }
}
