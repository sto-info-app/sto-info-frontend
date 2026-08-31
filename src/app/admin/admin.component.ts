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
import { catchError, of, switchMap } from 'rxjs';
import {
  STORYTIME_ADMIN_LINKS,
  StorytimeAdminLink,
  storytimeAdminRouterLink,
} from 'src/app/storytime/storytime-admin-links';
import { StorytimeService } from 'src/app/storytime/storytime.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { RoutingService } from 'src/app/shared/services/routing.service';

/**
 * Admin landing page linking to the content-management areas. This is the
 * lightweight in-app replacement for a separate admin portal.
 *
 * Laid out as Storytime's own management cards are: a heading bar over a grid
 * of panels, each carrying its colour and a line saying what the page is for.
 * The two are the same kind of page reached by different people, and looking
 * the same is what says so.
 *
 * Storytime's management pages are offered here too, in their own section.
 * Everything above it comes with the administrator role, while those three are
 * given out one at a time by permission, so they are filtered against what this
 * administrator actually holds rather than shown to every administrator.
 */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [RouterModule, CollapsibleSectionComponent],
})
export class AdminComponent implements OnInit {
  private readonly _routingService = inject(RoutingService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  appRoutes = APP_ROUTES;

  /**
   * The Storytime management pages this administrator has been given, if any.
   *
   * Empty until the answer arrives, so a card never appears and then vanishes.
   */
  storytimeLinks: StorytimeAdminLink[] = [];

  /**
   * Works out which of Storytime's management pages to offer.
   */
  ngOnInit(): void {
    this.loadStorytimeLinks();
  }

  /**
   * Builds a router link for a route key.
   *
   * @param route - The route path.
   * @returns The absolute link.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Where a Storytime management card sends its reader.
   *
   * @param link - The management page.
   * @returns The router link for it.
   */
  storytimeLinkFor(link: StorytimeAdminLink): unknown[] {
    return storytimeAdminRouterLink(link);
  }

  /**
   * Loads the Storytime management pages this administrator may open.
   *
   * The master switch is asked first: with Storytime off there are no such
   * pages to run, and a section offering three of them would be the only place
   * on the site still advertising the feature.
   *
   * Silent when it fails, and silent for an administrator holding none of the
   * three. Hiding the cards is a courtesy either way — the routes and the API
   * refuse anybody who does not hold the permission, whatever this page shows.
   */
  private loadStorytimeLinks(): void {
    this._storytimeService
      .isEnabled()
      .pipe(
        switchMap(isEnabled =>
          isEnabled
            ? this._accessControlService.getMyPermissions()
            : of(new Set<string>() as ReadonlySet<string>),
        ),
        catchError(() => of(new Set<string>() as ReadonlySet<string>)),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(permissions => {
        this.storytimeLinks = STORYTIME_ADMIN_LINKS.filter(link =>
          permissions.has(link.permission),
        );
      });
  }
}
