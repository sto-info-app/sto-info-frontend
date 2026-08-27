import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  STORYTIME_POLICY_EFFECTIVE_DATE,
  STORYTIME_POLICY_VERSION,
} from '../../storytime.constants';

/** A single entry in the publishing documents tab strip. */
export interface PolicyTab {
  /** Router link for the document. */
  link: string;

  /** Short label shown on the tab. */
  label: string;
}

/**
 * The heading shared by the three Storytime publishing documents.
 *
 * They are written to be read together — each defers to the other two on
 * points it does not settle — so they are presented as one page with a tab per
 * document rather than three pages that link to each other. Putting the strip,
 * the version and the effective date in one component means all three carry
 * the same ones, rather than three templates drifting apart every time the set
 * changes.
 *
 * Each tab is a link rather than a button because each document is its own
 * route: existing links and bookmarks keep working, the back button behaves,
 * and a reader can send somebody the document they actually mean.
 */
@Component({
  selector: 'app-policy-header',
  templateUrl: './policy-header.component.html',
  styleUrls: ['./policy-header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class PolicyHeaderComponent {
  /** The document's title, shown as the page heading. */
  @Input({ required: true }) title!: string;

  /** One line saying what the document is for. */
  @Input({ required: true }) intro!: string;

  /** The version of the terms this build presents. */
  readonly version = STORYTIME_POLICY_VERSION;

  /** When that version took effect. */
  readonly effectiveDate = STORYTIME_POLICY_EFFECTIVE_DATE;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _routingService = inject(RoutingService);

  /**
   * The documents in the set, in the order they are meant to be met: what you
   * may publish, then what you agree to by publishing it, then what the site
   * claims about the result.
   *
   * Which tab is lit is left to `routerLinkActive` rather than passed in, so
   * the strip cannot disagree with the URL.
   *
   * @returns The tabs, in strip order.
   */
  get tabs(): PolicyTab[] {
    return [
      {
        link: this._routingService.getLink(APP_ROUTES.STORYTIME_CONTENT_POLICY),
        label: 'Content Policy',
      },
      {
        link: this._routingService.getLink(APP_ROUTES.STORYTIME_TERMS),
        label: 'Terms of Use',
      },
      {
        link: this._routingService.getLink(APP_ROUTES.STORYTIME_FAN_CONTENT),
        label: 'Fan Content & IP Notice',
      },
    ];
  }
}
