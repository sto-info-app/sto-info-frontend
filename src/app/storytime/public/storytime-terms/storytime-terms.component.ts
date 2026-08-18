import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { PolicyHeaderComponent } from '../../shared/policy-header/policy-header.component';
import {
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
} from '../../storytime.constants';

/**
 * The Storytime terms of use.
 *
 * Separate from the site-wide terms rather than folded into them, because the
 * questions Storytime raises — what a licence to display fan fiction covers,
 * who owns a jointly-written Chapter, what "Removed" means — have no bearing on
 * somebody who only uses the rest of the site, and burying them in a general
 * document would mean nobody found them when it mattered.
 *
 * The list of representations is shared with the content policy page and the
 * publish checklist rather than restated, so a creator cannot be shown one set
 * of promises here and asked to make a different set when they publish.
 */
@Component({
  selector: 'app-storytime-terms',
  templateUrl: './storytime-terms.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, PolicyHeaderComponent],
})
export class StorytimeTermsComponent {
  /** What a creator confirms when they accept the terms for a Story. */
  readonly representations = PUBLISHING_REPRESENTATIONS;

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _routingService = inject(RoutingService);

  /**
   * Resolves a site-wide route to the link form the router expects.
   *
   * @param route - The route constant.
   * @returns The resolved link.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
