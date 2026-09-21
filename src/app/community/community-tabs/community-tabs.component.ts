import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  NgZone,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { RoutingService } from 'src/app/shared/services/routing.service';

/** A single entry in the community tab strip. */
export interface CommunityTab {
  /** Router link for the section. */
  link: string;

  /** Short label shown on the tab. */
  label: string;

  /**
   * Whether the tab only highlights on an exact URL match. Used by About, whose
   * route is the prefix of every other community route.
   */
  exact: boolean;
}

/**
 * The LCARS tab strip shared by every page in the community section, matching
 * the character detail page's tabs.
 *
 * Each tab is a link rather than a button because each section is its own
 * route, which keeps the sections bookmarkable and the back button working.
 */
@Component({
  selector: 'app-community-tabs',
  templateUrl: './community-tabs.component.html',
  styleUrls: ['./community-tabs.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class CommunityTabsComponent {
  private readonly _routingService = inject(RoutingService);
  private readonly _authService = inject(AuthService);
  private readonly _fleetConfiguration = inject(FleetConfigurationService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Whether the Fleet section is being offered.
   *
   * A field pushed from the subscription rather than a value read through
   * the async pipe, because the strip is built by one getter and the other
   * fact it needs — whether anybody is signed in — has to stay live. A
   * getter that read an observable's latest value would freeze the sign-in
   * check at the moment the strip was created.
   *
   * `observeInZone` is what puts the answer on screen: a component that
   * declares no strategy gets `OnPush` in Angular 22, and the request
   * finishing does not dirty this view.
   */
  private isFleetOffered = false;

  constructor() {
    this._fleetConfiguration
      .isOffered()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(isOffered => {
        this.isFleetOffered = isOffered;
      });
  }

  /**
   * The tabs to show. Friends is only offered to a signed-in officer, since it
   * is the one section behind the auth guard.
   *
   * Labels are kept short here rather than reusing the route titles, so that
   * the strip stays on one line.
   *
   * Fleets is last because it is the one tab that leaves the section: every
   * tab before it is a view of the registry, and a door out belongs at the
   * end of the strip rather than among them. Following it leaves no tab
   * lit, which is the honest outcome — the reader is no longer in the
   * Community section, and the sidebar says where they are instead.
   *
   * @returns The visible tabs, in strip order.
   */
  get tabs(): CommunityTab[] {
    const tabs: CommunityTab[] = [
      { link: this.link(APP_ROUTES.COMMUNITY), label: 'About', exact: true },
      {
        link: this.link(APP_ROUTES.COMMUNITY_REGISTRY_SEARCH),
        label: 'Search',
        exact: false,
      },
      {
        link: this.link(APP_ROUTES.COMMUNITY_REGISTRY_RECENTLY_JOINED),
        label: 'Recently Joined',
        exact: false,
      },
      {
        link: this.link(APP_ROUTES.COMMUNITY_REGISTRY_RECENTLY_ACTIVE),
        label: 'Recently Active',
        exact: false,
      },
      // Not exact, so the tab stays lit while drilling into a member's
      // profile, account and captain pages, which all sit below it.
      {
        link: this.link(APP_ROUTES.COMMUNITY_REGISTRY_PROFILES),
        label: 'Profiles',
        exact: false,
      },
    ];

    if (this._authService.isLoggedIn()) {
      tabs.push({
        link: this.link(APP_ROUTES.COMMUNITY_FRIENDS),
        label: 'Friends',
        exact: false,
      });
    }

    if (this.isFleetOffered) {
      tabs.push({
        link: this.link(APP_ROUTES.FLEETS),
        label: 'Fleets',
        // Exact, though it can never be lit from within this section. Said
        // plainly so that nothing later mistakes it for a tab that is meant
        // to match the addresses beneath it.
        exact: true,
      });
    }

    return tabs;
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  private link(route: string): string {
    return this._routingService.getLink(route);
  }
}
