import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { FleetScopeCardComponent } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.component';
import { FleetDirectoryState } from 'src/app/fleet/directory/fleet-directory-page.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

/**
 * Whichever of loading, failed, empty or a page of cards a listing is showing.
 *
 * Shared by the three listings, which differ in what they ask the server and
 * not at all in how an answer is drawn. Purely presentational: it is told the
 * state and reports which page was asked for, so the decision about what to
 * do with that stays with the page that owns the URL.
 *
 * The four states are drawn one at a time. A stale list left on screen
 * beneath an error message reads as a list that is still true, and a reader
 * who has just turned to page four deserves to be told it is coming rather
 * than shown page three for a moment longer.
 */
@Component({
  selector: 'app-fleet-directory-results',
  templateUrl: './fleet-directory-results.component.html',
  styleUrls: ['./fleet-directory-results.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FleetScopeCardComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
  ],
})
export class FleetDirectoryResultsComponent {
  /** What the listing currently has to show. */
  @Input({ required: true }) state!: FleetDirectoryState;

  /** What the bar above the list is called. */
  @Input({ required: true }) heading!: string;

  /** What is said while the request is in flight. */
  @Input({ required: true }) loadingText!: string;

  /** What is said when the question has no answers. */
  @Input({ required: true }) emptyMessage!: string;

  /** Emits the page the reader asked for, counting from one. */
  @Output() readonly pageChange = new EventEmitter<number>();

  /**
   * How many pages the current answer runs to.
   *
   * @returns The page count, or zero when there is nothing to page through.
   */
  get totalPages(): number {
    if (this.state.kind !== 'READY') {
      return 0;
    }

    return Math.ceil(this.state.results.total / this.state.results.pageSize);
  }
}
