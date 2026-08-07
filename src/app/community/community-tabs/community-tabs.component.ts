import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
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

  /**
   * The tabs to show. Friends is only offered to a signed-in officer, since it
   * is the one section behind the auth guard.
   *
   * Labels are kept short here rather than reusing the route titles, so that
   * the strip stays on one line.
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
