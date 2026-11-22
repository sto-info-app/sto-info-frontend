import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { FleetScopeCardComponent } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.component';
import { FleetScopeCardVm } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FleetScopeHeaderVm } from 'src/app/fleet/scope/fleet-scope-page.models';

/**
 * The head of a Community, Fleet or Armada page.
 *
 * Purely presentational, and shared by all three, because the head of each
 * says the same things in the same order. Three hand-written copies would be
 * three chances for one of them to draw a name without the space at its end.
 *
 * Drawn as the directory's card, with
 * the name as the page's heading and the kind of record on its block. A
 * banner that cannot be fetched is dropped rather than left as a broken image;
 * the card stands the character listings' "photo unavailable" picture in for
 * an emblem that is missing or broken.
 */
@Component({
  selector: 'app-fleet-scope-header',
  templateUrl: './fleet-scope-header.component.html',
  styleUrls: ['./fleet-scope-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FleetScopeCardComponent],
})
export class FleetScopeHeaderComponent {
  private _vm!: FleetScopeHeaderVm;

  /** Set once the banner has failed to load. */
  hasBannerFailed = false;

  /** The record as the card draws it. */
  card!: FleetScopeCardVm;

  /** What to draw. */
  @Input({ required: true }) set vm(value: FleetScopeHeaderVm) {
    this._vm = value;
    this.card = headerCardOf(value);
    // A page resolved to a different record — an address replaced, or the
    // reader following a link to a sibling — starts with a clean slate, or a
    // failure remembered from the last one would hide a picture that is fine.
    this.hasBannerFailed = false;
  }

  get vm(): FleetScopeHeaderVm {
    return this._vm;
  }

  /** Drops the banner when it cannot be fetched. */
  onBannerError(): void {
    this.hasBannerFailed = true;
  }
}

/**
 * The head of a record's page as the directory's card.
 *
 * The page's facts become the card's details. The platform is among them on a
 * Fleet's and an Armada's page, and the card already sets it out with its icon,
 * so it is not said twice.
 *
 * @param header - The head of the page.
 * @returns The card.
 */
function headerCardOf(header: FleetScopeHeaderVm): FleetScopeCardVm {
  return {
    id: header.name,
    scope: header.scope,
    emblem: header.emblem,
    name: header.name,
    communityName: header.communityName,
    communityLink: header.communityLink,
    platform: header.platform,
    link: null,
    unlinkedTitle: null,
    status: header.status,
    roster: null,
    details: header.facts.filter(
      fact => !(fact.label === 'Platform' && fact.value === header.platform),
    ),
    meta: [],
    actions: [],
  };
}
