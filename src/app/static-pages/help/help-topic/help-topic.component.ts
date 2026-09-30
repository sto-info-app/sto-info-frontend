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
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';

import { HelpFeaturesService } from '../help-features.service';
import {
  blockingFeature,
  findHelpTopic,
  HELP_FEATURE_NAMES,
  isFeatureOffered,
  switchedOffFeature,
  switchedOffNote,
  isGuidePermitted,
  isTopicPermitted,
} from '../help.data';
import { HelpFeature, HelpGuide, HelpTopic } from '../help.models';

/**
 * One section of the help: its introduction and the guides in it (FC-048).
 *
 * Steve's decision of 29 September 2026 gives each section a page of its own
 * at `/help/topics/<id>`, which the Help home's tiles open and each guide's
 * breadcrumb leads back to. The address has two parts where a guide's has
 * one, so a section can never answer for a guide, or a guide for a section.
 *
 * It decides what to show the way a guide does. An unknown section, one for
 * site administrators asked for by anybody else (FC-050), and one whose
 * every guide asks for a permission the reader does not hold, go to the
 * not-found page. A section about a feature that is out of reach (Storytime,
 * or Fleet Community since FC-049) is answered with a notice saying why,
 * since that is temporary rather than a wrong address.
 */
@Component({
  selector: 'app-help-topic',
  templateUrl: './help-topic.component.html',
  standalone: true,
  imports: [RouterModule, FeatureUnavailableComponent],
})
export class HelpTopicComponent implements OnInit {
  /** Route constants, for the links out of this page. */
  readonly appRoutes = APP_ROUTES;

  /** The section being read, once it has been resolved. */
  topic: HelpTopic | null = null;

  /** Its guides that this reader may open, in reading order. */
  guides: HelpGuide[] = [];

  /** The note on each shown guide whose own switch is off, or null (FC-050). */
  guideNotes: (string | null)[] = [];

  /** The note that the section's feature is switched off, or null (FC-050). */
  switchedOff: string | null = null;

  /**
   * Why the section's feature is out of reach, when it is. Null whenever the
   * section itself is shown.
   */
  unavailableReason: FeatureUnavailableReason | null = null;

  /** The feature the notice is about. */
  unavailableFeatureName = '';

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _routingService = inject(RoutingService);
  private readonly _pageTitleService = inject(PageTitleService);
  private readonly _helpFeatures = inject(HelpFeaturesService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Resolves the section named in the address, and watches it, so moving
   * between sections re-renders in place.
   *
   * A permission lookup that fails leaves the reader with the guides anybody
   * may read, as the Help home does.
   *
   * @returns void
   */
  ngOnInit(): void {
    combineLatest([
      this._route.paramMap.pipe(map(params => params.get('topicId'))),
      this._helpFeatures.features(),
      this._accessControlService
        .getMyPermissions()
        .pipe(catchError(() => of(new Set<string>() as ReadonlySet<string>))),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(([topicId, features, permissions]) => {
        const topic = findHelpTopic(topicId);

        if (!topic || !isTopicPermitted(topic, this._authService.isAdmin())) {
          this.sendToNotFound();
          return;
        }

        const blocking = blockingFeature(features, topic.requiresFeature);

        if (blocking) {
          this.showUnavailable(blocking, features[blocking]);
          return;
        }

        const guides = topic.guides.filter(
          guide =>
            isGuidePermitted(guide, permissions) &&
            isFeatureOffered(guide.requiresFeature, features),
        );

        if (guides.length === 0) {
          this.sendToNotFound();
          return;
        }

        const off = switchedOffFeature(features, topic.requiresFeature);

        this.unavailableReason = null;
        this.topic = topic;
        this.guides = guides;
        this.switchedOff = off === null ? null : switchedOffNote(off, 'topic');
        // A guide says nothing more while the whole section is noted.
        this.guideNotes = guides.map(guide => {
          const guideOff = switchedOffFeature(features, guide.requiresFeature);

          return off !== null || guideOff === null
            ? null
            : `${HELP_FEATURE_NAMES[guideOff]} is switched off at the moment.`;
        });
        this._pageTitleService.setTitle(topic.title);
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

  /**
   * Says why a section cannot be read, in place of it.
   *
   * @param feature The feature out of reach.
   * @param availability Why: switched off, or not answering.
   * @returns void
   */
  private showUnavailable(
    feature: HelpFeature,
    availability: StorytimeAvailability,
  ): void {
    this.topic = null;
    this.guides = [];
    this.unavailableFeatureName = HELP_FEATURE_NAMES[feature];
    this.unavailableReason =
      availability === STORYTIME_AVAILABILITY_UNAVAILABLE
        ? FEATURE_UNAVAILABLE_OFFLINE
        : FEATURE_UNAVAILABLE_DISABLED;
    this._pageTitleService.setTitle(this.unavailableFeatureName);
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
