import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { FleetExactNameComponent } from 'src/app/fleet/components/fleet-exact-name/fleet-exact-name.component';
import { FleetScopeBadgeComponent } from 'src/app/fleet/components/fleet-scope-badge/fleet-scope-badge.component';

import { FleetScopeCardVm } from './fleet-scope-card.model';

/**
 * A Community, Fleet or Armada as it appears in a listing.
 *
 * Purely presentational, in the same way the account, captain and member cards
 * are: the card reports which action was pressed and the page listing it does
 * the work, so confirmation, reloading and error handling stay in one place
 * rather than being repeated per card.
 *
 * The card exists to make two registrations of the same Fleet name tellable
 * apart. Anybody may register a Fleet here and nothing proves they run it, so
 * the card shows the Community that registered it, the platform, the exact
 * name and when it was last seen in an import — which is everything a reader
 * needs to pick the right one of two cards reading "Starfleet Command".
 */
@Component({
  selector: 'app-fleet-scope-card',
  templateUrl: './fleet-scope-card.component.html',
  styleUrls: ['./fleet-scope-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FleetExactNameComponent,
    FleetScopeBadgeComponent,
  ],
})
export class FleetScopeCardComponent {
  private _vm!: FleetScopeCardVm;

  /** Set once this card's emblem has failed to load. */
  hasEmblemFailed = false;

  /** What to draw. */
  @Input({ required: true }) set vm(value: FleetScopeCardVm) {
    this._vm = value;
    // A card in a list is reused for a different record as the page turns, and
    // a failure remembered from the last one would hide an emblem that is
    // perfectly fine.
    this.hasEmblemFailed = false;
  }

  get vm(): FleetScopeCardVm {
    return this._vm;
  }

  /** Set while an action is in flight, so every button on the card disables. */
  @Input() isActing = false;

  /** Emits the `key` of the action button the viewer activated. */
  @Output() readonly action = new EventEmitter<string>();

  /**
   * Drops the emblem when it cannot be fetched.
   *
   * A broken-image icon says nothing a reader can act on, and the row reads
   * perfectly well without a picture.
   */
  onEmblemError(): void {
    this.hasEmblemFailed = true;
  }
}
