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
import { FLEET_SCOPE_LABELS } from 'src/app/fleet/constants/fleet-scope.constants';
import { SRC_PHOTO_UNAVAILABLE_300PX } from 'src/app/shared/constants/app-image-assets.constants';
import {
  getAccountBgImagePath,
  getPlatformClass,
  getPlatformIconClass,
} from 'src/app/shared/utils/card-theme.utils';

import { FleetScopeCardVm } from './fleet-scope-card.model';

/** Distinguishes one card's name from another's, for `aria-describedby`. */
let nextFleetScopeCardId = 0;

/**
 * The icon beside each state, by the state's modifier. Every one is in the
 * subsetted Font Awesome kit, checked against the running app (13 October
 * 2026); a glyph that is not renders as nothing at all, silently.
 */
const STATUS_ICONS: Readonly<Record<string, string>> = {
  recruiting: 'fa-solid fa-user-plus',
  application: 'fa-solid fa-hourglass-half',
  invite: 'fa-solid fa-envelope',
  closed: 'fa-solid fa-circle-xmark',
  suspended: 'fa-solid fa-ban',
  disputed: 'fa-solid fa-gavel',
};

/**
 * The icon beside the roster line: the members the roster lists, as the site
 * counts its own members with. In the kit, checked against the running app
 * (27 October 2026).
 */
export const ROSTER_ICON = 'fa-solid fa-users';

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

  /** The picture the character listings show when a portrait is missing. */
  readonly unavailableSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  /** Identifies the card's name, which describes its view control. */
  readonly nameId = `fleet-scope-card-name-${nextFleetScopeCardId++}`;

  /**
   * What the view control in the card's right-hand column says: "View Fleet",
   * as an account card's says "View Account".
   */
  get viewLabel(): string {
    return `View ${FLEET_SCOPE_LABELS[this._vm.scope]}`;
  }

  /** The icon beside the roster line, the same whatever the line says. */
  readonly rosterIcon = ROSTER_ICON;

  /** The platform's icon, or null where it has none or there is no platform. */
  get platformIcon(): string | null {
    return getPlatformIconClass(this._vm.platform);
  }

  /**
   * A state's icon.
   *
   * @param modifier - The state, as its modifier names it.
   * @returns The icon, or null for a state without one.
   */
  statusIconOf(modifier: string): string | null {
    return STATUS_ICONS[modifier] ?? null;
  }

  /**
   * The picture behind the details: the account list's art for the platform,
   * so a Fleet on Xbox looks like an Xbox account (13 October 2026). A
   * Community, on no platform, takes the default.
   */
  get backgroundPath(): string {
    return getAccountBgImagePath(getPlatformClass(this._vm.platform));
  }

  /** Set while an action is in flight, so every button on the card disables. */
  @Input() isActing = false;

  /**
   * Whether the name is the page's heading: on a record's own page, where the
   * card is the head of the page rather than a row in a listing.
   */
  @Input() nameHeading = false;

  /**
   * Whether the block says which kind of record this is. A listing holds one
   * kind and does not; a record's own page does.
   */
  @Input() showScope = false;

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
