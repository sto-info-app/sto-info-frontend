import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
 * Steve's decision of 12 October 2026 replaced the bare dark boxes a page used
 * to put a block in — a follow box, a filter box, a list of alerts — with this
 * one shape, the one the dashboard and Storytime already draw their cards in.
 *
 * Its colour comes from the page's rotation (`--lcars-accent`), so a run of
 * panels varies by itself; `accent` names one where a panel must keep a colour
 * of its own. Marks for the heading block — a count, a state — are projected
 * with `panelMarks`.
 */
@Component({
  selector: 'app-lcars-panel',
  templateUrl: './lcars-panel.component.html',
  styleUrls: ['./lcars-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "accent() ? 'accent-' + accent() : ''" },
})
export class LcarsPanelComponent {
  /** The panel's name, on its heading block. */
  readonly heading = input.required<string>();

  /** The heading's level in the page's outline. */
  readonly level = input<2 | 3 | 4>(3);

  /** A colour of the panel's own, in place of the page's rotation. */
  readonly accent = input<LcarsPanelAccent | null>(null);

  /** Identifies the panel's name for the region it labels. */
  readonly headingId = `lcars-panel-heading-${nextLcarsPanelId++}`;
}
