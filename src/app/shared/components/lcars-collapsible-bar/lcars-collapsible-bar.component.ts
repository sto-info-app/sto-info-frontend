import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';

/**
 * The bar over a side column's group of controls, such as its Filters or
 * its Sort, with the caret that shows or hides them.
 *
 * Only the bar: the group beneath stays in the page, which shows it while
 * `collapsed` is false. Its host takes no box of its own, so the bar sits in
 * the column exactly as the markup it replaces did.
 */
@Component({
  selector: 'app-lcars-collapsible-bar',
  templateUrl: './lcars-collapsible-bar.component.html',
  styleUrls: ['./lcars-collapsible-bar.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LcarsCollapsibleBarComponent {
  /** What the group is called, such as “Filters”. */
  readonly label = input.required<string>();

  /** Whether the group beneath is hidden. */
  readonly collapsed = model.required<boolean>();

  /** Shows the group if it is hidden, or hides it. */
  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }
}
