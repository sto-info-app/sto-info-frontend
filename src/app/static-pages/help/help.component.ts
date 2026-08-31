import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { catchError, combineLatest, of } from 'rxjs';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { visibleHelpTopics } from './help.data';
import { HelpTopic } from './help.models';

/**
 * The help index.
 *
 * Lists the guides on offer, grouped by the part of the site they cover. The
 * guides themselves are content held in `help.data.ts`; this page only decides
 * which of them a given visitor may be shown.
 *
 * It checks the Storytime switch itself rather than being told, because it is
 * reachable whether or not Storytime exists — unlike the Storytime pages, which
 * a guard has already vetted before they render.
 */
@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  standalone: true,
  imports: [RouterModule, CollapsibleSectionComponent],
})
export class HelpComponent implements OnInit {
  /** Route constants, for the links out of this page. */
  readonly appRoutes = APP_ROUTES;

  /** The topics this visitor may be offered. */
  topics: HelpTopic[] = [];

  private readonly _routingService = inject(RoutingService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Works out which topics to show.
   *
   * Storytime guides wait on the feature switch: while Storytime is off it is
   * meant to look like a feature that does not exist, and a page of guides
   * describing it would give that away.
   *
   * The guides for running Storytime wait on the permission for the page each
   * one describes, so a moderator is offered the moderation guide and nobody
   * else is offered a guide to a page they would be turned away from.
   *
   * A permission lookup that fails leaves the reader with the public guides
   * rather than with nothing: help is the wrong page to answer with an
   * apology, and the guides being withheld are the ones almost nobody wants.
   *
   * @returns void
   */
  ngOnInit(): void {
    combineLatest([
      this._storytimeService.isEnabled(),
      this._accessControlService
        .getMyPermissions()
        .pipe(catchError(() => of(new Set<string>() as ReadonlySet<string>))),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(([isStorytimeEnabled, permissions]) => {
        this.topics = visibleHelpTopics(isStorytimeEnabled, permissions);
      });
  }

  /**
   * Builds the path to a guide.
   *
   * @param slug The guide's slug.
   * @returns The router path to that guide.
   */
  getGuideLink(slug: string): string {
    return `${this._routingService.getLink(this.appRoutes.HELP)}/${slug}`;
  }

  /**
   * Translates a route constant into a path string.
   *
   * @param route The route key to look up.
   * @returns The path string starting with /.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
