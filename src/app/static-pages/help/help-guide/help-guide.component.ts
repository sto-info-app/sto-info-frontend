import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { HelpSectionComponent } from '../help-section/help-section.component';
import { findHelpGuide } from '../help.data';
import { HelpGuide, HelpGuideLocation } from '../help.models';

/**
 * One help guide.
 *
 * A single page for every guide rather than a component each: the guides differ
 * only in their words, so giving each one a component would be seven copies of
 * the same template kept in step by hand.
 *
 * A slug that names no guide, or one whose topic this visitor may not be shown,
 * goes to the not-found page. Refusing quietly matters for the Storytime
 * guides: while the feature is off it is meant to look like a feature that does
 * not exist, and a help page explaining it would say otherwise.
 */
@Component({
  selector: 'app-help-guide',
  templateUrl: './help-guide.component.html',
  standalone: true,
  imports: [RouterModule, HelpSectionComponent],
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

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _routingService = inject(RoutingService);
  private readonly _pageTitleService = inject(PageTitleService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);

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
      this._storytimeService.isEnabled(),
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([slug, isStorytimeEnabled]) => {
        const location = findHelpGuide(slug);

        if (!location || !this.isVisible(location, isStorytimeEnabled)) {
          this.sendToNotFound();
          return;
        }

        this.show(location);
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
   * Determines whether a guide may be shown to this visitor.
   *
   * @param location The guide and the topic it belongs to.
   * @param isStorytimeEnabled Whether Storytime is switched on.
   * @returns `true` when the guide's topic is available.
   */
  private isVisible(
    location: HelpGuideLocation,
    isStorytimeEnabled: boolean,
  ): boolean {
    return isStorytimeEnabled || !location.topic.requiresStorytime;
  }

  /**
   * Puts a resolved guide on screen.
   *
   * The title is set here rather than from route data because one route serves
   * every guide, so the address is the only thing that says which.
   *
   * @param location The guide and the topic it belongs to.
   * @returns void
   */
  private show(location: HelpGuideLocation): void {
    this.guide = location.guide;
    this.topicTitle = location.topic.title;
    this.otherGuides = location.topic.guides.filter(
      candidate => candidate.slug !== location.guide.slug,
    );
    this._pageTitleService.setTitle(location.guide.title);
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
