import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';
import {
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
  StorytimeAvailability,
} from 'src/app/models/storytime.models';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { findHelpGuide, isGuidePermitted } from '../help.data';
import { HelpGuide, HelpGuideLocation } from '../help.models';

/**
 * One help guide.
 *
 * A single page for every guide rather than a component each: the guides differ
 * only in their words, so giving each one a component would be seven copies of
 * the same template kept in step by hand.
 *
 * A slug that names no guide, and one asking for a permission the visitor does
 * not hold, go to the not-found page: neither page is something to advertise to
 * somebody who cannot open it.
 *
 * A Storytime guide asked for while Storytime is out of reach is a different
 * case, and is answered with a notice saying why rather than a 404. The switch
 * being off and the backend not answering are both temporary, and neither is a
 * wrong address — a visitor told their address is wrong will not come back
 * when the feature returns.
 */
@Component({
  selector: 'app-help-guide',
  templateUrl: './help-guide.component.html',
  standalone: true,
  imports: [
    RouterModule,
    CollapsibleSectionComponent,
    FeatureUnavailableComponent,
  ],
})
export class HelpGuideComponent implements OnInit {
  /** Route constants, for the links out of this page. */
  readonly appRoutes = APP_ROUTES;

  /** The guide being read, once it has been resolved. */
  guide: HelpGuide | null = null;

  /** The other guides in the same topic, offered at the end. */
  otherGuides: HelpGuide[] = [];

  /** The topic heading, shown above the guide's title. */
  topicTitle = '';

  /**
   * Why Storytime is out of reach, when a Storytime guide was asked for and
   * the feature is not there. Null whenever the guide itself is shown.
   */
  unavailableReason: FeatureUnavailableReason | null = null;

  /** The feature the notice is about. */
  readonly storytimeFeatureName = 'Storytime';

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _routingService = inject(RoutingService);
  private readonly _pageTitleService = inject(PageTitleService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Resolves the guide named in the address.
   *
   * Watches the parameter rather than reading it once, so following a link to
   * another guide from the foot of this one re-renders in place.
   *
   * @returns void
   */
  ngOnInit(): void {
    combineLatest([
      this._route.paramMap.pipe(map(params => params.get('guideSlug'))),
      this._storytimeService.getAvailability(),
      this._accessControlService
        .getMyPermissions()
        .pipe(catchError(() => of(new Set<string>() as ReadonlySet<string>))),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(([slug, storytimeAvailability, permissions]) => {
        const location = findHelpGuide(slug);

        if (!location) {
          this.sendToNotFound();
          return;
        }

        if (
          location.topic.requiresStorytime &&
          storytimeAvailability !== STORYTIME_AVAILABILITY_ENABLED
        ) {
          this.showUnavailable(storytimeAvailability);
          return;
        }

        if (!isGuidePermitted(location.guide, permissions)) {
          this.sendToNotFound();
          return;
        }

        this.show(location, permissions);
      });
  }

  /**
   * Builds the path to another guide.
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

  /**
   * Puts a resolved guide on screen.
   *
   * The title is set here rather than from route data because one route serves
   * every guide, so the address is the only thing that says which.
   *
   * What is offered at the foot is filtered the same way the index is. A
   * moderator reading about the queue should not be offered the Spotlight
   * guide when the Spotlight is not their job: the link would take them to the
   * not-found page.
   *
   * @param location The guide and the topic it belongs to.
   * @param permissions The permission codes the visitor holds.
   * @returns void
   */
  private show(
    location: HelpGuideLocation,
    permissions: ReadonlySet<string>,
  ): void {
    this.unavailableReason = null;
    this.guide = location.guide;
    this.topicTitle = location.topic.title;
    this.otherGuides = location.topic.guides.filter(
      candidate =>
        candidate.slug !== location.guide.slug &&
        isGuidePermitted(candidate, permissions),
    );
    this._pageTitleService.setTitle(location.guide.title);
  }

  /**
   * Says why a Storytime guide cannot be read, in place of the guide.
   *
   * The page title is set to the topic rather than the guide's, because the
   * guide is not what is being shown and naming it in the tab would advertise
   * exactly what the notice is declining to open.
   *
   * @param availability Why Storytime is out of reach.
   * @returns void
   */
  private showUnavailable(availability: StorytimeAvailability): void {
    this.guide = null;
    this.otherGuides = [];
    this.topicTitle = '';
    this.unavailableReason =
      availability === STORYTIME_AVAILABILITY_UNAVAILABLE
        ? FEATURE_UNAVAILABLE_OFFLINE
        : FEATURE_UNAVAILABLE_DISABLED;
    this._pageTitleService.setTitle(this.storytimeFeatureName);
  }

  /**
   * Sends the visitor to the not-found page.
   *
   * @returns void
   */
  private sendToNotFound(): void {
    void this._router.navigate([`/${this.appRoutes.PAGE_NOT_FOUND}`]);
  }
}
