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
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { RoutingService } from 'src/app/shared/services/routing.service';

import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { HelpFeaturesService } from './help-features.service';
import { visibleHelpTopics } from './help.data';
import { HelpTopic } from './help.models';

/**
 * The help index.
 *
 * One tile for each section on offer, which opens the section's own page
 * (FC-048, Steve's decisions of 29 September 2026). The guides themselves are
 * content held in `help.data.ts`; this page only decides which sections a
 * given visitor may be shown, and how many guides each holds for them.
 *
 * It checks the feature switches itself rather than being told, because it is
 * reachable whether or not Storytime or Fleet Community exists — unlike their
 * own pages, which a guard has already vetted before they render.
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
  private readonly _helpFeatures = inject(HelpFeaturesService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Works out which topics to show.
   *
   * Guides about Storytime, Fleet Community or Fleet chat wait on its switch:
   * while a feature is off it is meant to look like one that does not exist,
   * and a page of guides describing it would give that away.
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
      this._helpFeatures.features(),
      this._accessControlService
        .getMyPermissions()
        .pipe(catchError(() => of(new Set<string>() as ReadonlySet<string>))),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(([features, permissions]) => {
        this.topics = visibleHelpTopics(
          features,
          permissions,
          this._authService.isAdmin(),
        );
      });
  }

  /**
   * Builds the path to a section's page (FC-048).
   *
   * @param id The section's id.
   * @returns The router path to that section.
   */
  getTopicLink(id: string): string {
    return this._routingService.getLink(
      this.appRoutes.HELP_TOPIC.replace(':topicId', id),
    );
  }

  /**
   * How many guides a tile's section holds for this reader, in words.
   *
   * @param topic The section, already filtered to what the reader may open.
   * @returns For example "6 guides".
   */
  guideCountOf(topic: HelpTopic): string {
    return topic.guides.length === 1
      ? '1 guide'
      : `${topic.guides.length} guides`;
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
