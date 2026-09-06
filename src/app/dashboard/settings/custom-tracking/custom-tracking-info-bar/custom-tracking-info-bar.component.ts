import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** What a bar can be describing. */
export type CustomTrackingInfoBarKind = 'section' | 'tab';

/**
 * The panel that says what one section or one tab is, and carries the controls
 * that arrange it.
 *
 * A heading bar has room for a name and one caret, and the caret it has room
 * for is the one that folds the panel away. Everything else a reader needs —
 * who may see this, how much is inside it, and the arrows, pen and bin that
 * change it — is stated here instead, on a panel of its own beneath the bar.
 * Arrows that reorder sitting beside a caret that folds is what made the bar
 * hard to read: two carets an inch apart, doing unrelated things.
 *
 * Drawn as a panel rather than as a bare row, because a line of badges
 * floating under a heading belongs to nothing in particular. The section's is
 * the deeper blue and the tab's the lighter one, so a section's panel and the
 * panel of a tab inside it are never read as two of the same thing.
 *
 * What it reports it reports in words as well as in colour: public or private
 * is written out either way, so silence never has to be read as one of them.
 *
 * The controls are projected rather than built here, because what a section
 * can be asked to do and what a tab can differ, and where those controls sit
 * does not.
 */
@Component({
  selector: 'app-custom-tracking-info-bar',
  templateUrl: './custom-tracking-info-bar.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTrackingInfoBarComponent {
  /** What the thing is called. */
  @Input({ required: true }) name!: string;

  /** What kind of thing it is, named in the panel and drawn in its colour. */
  @Input({ required: true }) kind!: CustomTrackingInfoBarKind;

  /** What it holds, in words — "2 tabs" — or null where nothing is counted. */
  @Input() summary: string | null = null;

  /** Whether its owner has asked for it to be public. */
  @Input() publiclyVisible = false;

  /** Whether a moderator has hidden it. */
  @Input() suppressed = false;

  /**
   * Whether this panel describes a section rather than a tab.
   *
   * @returns True when the panel should take the outer colour.
   */
  get isSection(): boolean {
    return this.kind === 'section';
  }
}
