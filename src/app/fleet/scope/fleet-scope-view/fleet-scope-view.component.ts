import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { FleetScopeArtworkComponent } from 'src/app/fleet/scope/fleet-scope-artwork/fleet-scope-artwork.component';
import { FleetScopeHeaderComponent } from 'src/app/fleet/scope/fleet-scope-header/fleet-scope-header.component';
import { FleetScopePageState } from 'src/app/fleet/scope/fleet-scope-page.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

/**
 * Whichever of loading, absent, failed or a record a scope page is showing.
 *
 * Shared by the three scope pages, which differ in what they ask the server
 * and in the facts they list, and not at all in how any of that is framed.
 *
 * Absent is an information notice rather than an error. A closed Community
 * or an out-of-date link is an ordinary thing to run into, and dressing it
 * as a fault would have readers reporting it.
 */
@Component({
  selector: 'app-fleet-scope-view',
  templateUrl: './fleet-scope-view.component.html',
  styleUrls: ['./fleet-scope-view.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FleetScopeArtworkComponent,
    FleetScopeHeaderComponent,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LoadingBarComponent,
  ],
})
export class FleetScopeViewComponent {
  /** What the page currently has to show. */
  @Input({ required: true }) state!: FleetScopePageState;

  /** What is said while the request is in flight. */
  @Input({ required: true }) loadingText!: string;

  /** What is said when nothing answers to the address. */
  @Input({ required: true }) missingMessage!: string;

  /**
   * Raised when the record should be read again.
   *
   * Passed straight up rather than acted on here. This component knows what
   * a page is showing and nothing about how it was asked for.
   */
  @Output() readonly changed = new EventEmitter<void>();
}
