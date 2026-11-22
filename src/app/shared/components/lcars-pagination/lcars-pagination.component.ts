import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/**
 * The pager beneath a list that is read a page at a time: a button back, which
 * page this is of how many, and a button on.
 *
 * The page and the count are the list's own; the pager only says which way
 * the reader asked to go. Its host takes no box of its own, so the pager sits
 * in the list's layout exactly as the markup it replaces did.
 */
@Component({
  selector: 'app-lcars-pagination',
  templateUrl: './lcars-pagination.component.html',
  styleUrls: ['./lcars-pagination.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LcarsPaginationComponent {
  /** The page shown, counting from one. */
  readonly page = input.required<number>();

  /** How many pages there are. */
  readonly pageCount = input.required<number>();

  /** What the button back says, such as “Newer”. */
  readonly previousLabel = input('Previous');

  /** What the button on says, such as “Older”. */
  readonly nextLabel = input('Next');

  /** Asks for the page before (-1) or after (1) the one shown. */
  readonly turn = output<-1 | 1>();
}
