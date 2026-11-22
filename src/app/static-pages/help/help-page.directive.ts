import {
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  NgZone,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
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

import { HelpFeaturesService } from './help-features.service';
import { HELP_FEATURE_NAMES } from './help.data';
import { HelpFeature, HelpFeatures } from './help.models';

/**
 * What a help page is resolved from: the part of its address that names it,
 * where each feature switch stands, and the permissions the reader holds.
 */
export type HelpPageResolver = (
  name: string | null,
  features: HelpFeatures,
  permissions: ReadonlySet<string>,
) => void;

/**
 * The half of a help page that is the same for a section and a guide.
 *
 * Both are named by their address, and both decide what to show from where
 * the feature switches stand and what the reader may open: an address naming
 * nothing they may read goes to the not-found page, a feature out of reach is
 * answered with a notice saying why, and a feature the backend could not be
 * asked about is noted above what is shown.
 */
@Directive()
export abstract class HelpPageDirective {
  /** Route constants, for the links out of this page. */
  readonly appRoutes = APP_ROUTES;

  /**
   * Why the page's feature is out of reach, when it is. Null whenever the page
   * itself is shown.
   */
  unavailableReason: FeatureUnavailableReason | null = null;

  /** The feature the notice is about. */
  unavailableFeatureName = '';

  /**
   * The page's feature when the backend could not be asked about it, for the
   * notice above it; null otherwise (FC-044).
   */
  unreachableFeatureName: string | null = null;

  /** Why, for that notice: the systems are not answering. */
  readonly unreachableReason = FEATURE_UNAVAILABLE_OFFLINE;

  protected readonly _routingService = inject(RoutingService);
  protected readonly _pageTitleService = inject(PageTitleService);
  protected readonly _authService = inject(AuthService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _helpFeatures = inject(HelpFeaturesService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

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
   * Resolves the page named in the address, and watches it, so following a
   * link to another page of the same kind re-renders in place.
   *
   * A permission lookup that fails leaves the reader with what anybody may
   * read, as the Help home does.
   *
   * @param param The route parameter that names the page.
   * @param resolve Decides what to show.
   * @returns void
   */
  protected watchPage(param: string, resolve: HelpPageResolver): void {
    combineLatest([
      this._route.paramMap.pipe(map(params => params.get(param))),
      this._helpFeatures.features(),
      this._accessControlService
        .getMyPermissions()
        .pipe(catchError(() => of(new Set<string>() as ReadonlySet<string>))),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(([name, features, permissions]) =>
        resolve(name, features, permissions),
      );
  }

  /**
   * Records that the page is shown, noting its feature when the backend could
   * not be asked about it.
   *
   * @param unreachable The feature that could not be asked about, or null.
   * @returns void
   */
  protected markShown(unreachable: HelpFeature | null): void {
    this.unavailableReason = null;
    this.unreachableFeatureName =
      unreachable === null ? null : HELP_FEATURE_NAMES[unreachable];
  }

  /**
   * Records why the page cannot be read, in place of it.
   *
   * The page title is set to the feature rather than the page's own, because
   * the page is not what is being shown and naming it in the tab would
   * advertise exactly what the notice is declining to open.
   *
   * @param feature The feature out of reach.
   * @returns void
   */
  protected markUnavailable(feature: HelpFeature): void {
    this.unavailableFeatureName = HELP_FEATURE_NAMES[feature];
    this.unreachableFeatureName = null;
    this.unavailableReason = FEATURE_UNAVAILABLE_DISABLED;
    this._pageTitleService.setTitle(this.unavailableFeatureName);
  }

  /**
   * Sends the visitor to the not-found page.
   *
   * @returns void
   */
  protected sendToNotFound(): void {
    void this._router.navigate([`/${this.appRoutes.PAGE_NOT_FOUND}`]);
  }
}
