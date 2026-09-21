import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FleetExactNameComponent } from 'src/app/fleet/components/fleet-exact-name/fleet-exact-name.component';
import { FleetScopeBadgeComponent } from 'src/app/fleet/components/fleet-scope-badge/fleet-scope-badge.component';
import { FleetScopeHeaderVm } from 'src/app/fleet/scope/fleet-scope-page.models';

/**
 * The head of a Community, Fleet or Armada page.
 *
 * Purely presentational, and shared by all three, because the head of each
 * says the same things in the same order. Three hand-written copies would be
 * three chances for one of them to draw a name without the space at its end.
 *
 * A picture that cannot be fetched is dropped rather than left as a broken
 * image. The page reads perfectly well without one, and a broken-image icon
 * says nothing a reader can act on.
 */
@Component({
  selector: 'app-fleet-scope-header',
  templateUrl: './fleet-scope-header.component.html',
  styleUrls: ['./fleet-scope-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, FleetExactNameComponent, FleetScopeBadgeComponent],
})
export class FleetScopeHeaderComponent {
  private _vm!: FleetScopeHeaderVm;

  /** Set once the banner has failed to load. */
  hasBannerFailed = false;

  /** Set once the emblem has failed to load. */
  hasEmblemFailed = false;

  /** What to draw. */
  @Input({ required: true }) set vm(value: FleetScopeHeaderVm) {
    this._vm = value;
    // A page resolved to a different record — an address replaced, or the
    // reader following a link to a sibling — starts with a clean slate, or a
    // failure remembered from the last one would hide a picture that is fine.
    this.hasBannerFailed = false;
    this.hasEmblemFailed = false;
  }

  get vm(): FleetScopeHeaderVm {
    return this._vm;
  }

  /**
   * Drops the banner when it cannot be fetched.
   */
  onBannerError(): void {
    this.hasBannerFailed = true;
  }

  /**
   * Drops the emblem when it cannot be fetched.
   */
  onEmblemError(): void {
    this.hasEmblemFailed = true;
  }
}
