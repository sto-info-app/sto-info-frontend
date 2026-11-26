import { Directive, inject } from '@angular/core';
import {
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  SRC_PHOTO_UNAVAILABLE_100PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { MemberVm } from './models/member-vm.model';
import { TeamGroup } from './models/team-group.model';
import { TeamMember } from './models/team-member.model';
import { TeamNavLink } from './models/team-nav-link.model';
import { TEAM_MEMBERS } from './team.data';

/**
 * Where each list page's first Navigation button leads: Developers to
 * Volunteers and back. Held here, beside the lists themselves, so the pairing
 * is decided once rather than in each page.
 */
const TEAM_CROSS_LINK_ROUTES: Record<
  TeamGroup,
  { route: string; label: string }
> = {
  developers: {
    route: APP_ROUTES.ABOUT_VOLUNTEERS,
    label: APP_ROUTE_TITLES.ABOUT_VOLUNTEERS,
  },
  volunteers: {
    route: APP_ROUTES.ABOUT_DEVELOPERS,
    label: APP_ROUTE_TITLES.ABOUT_DEVELOPERS,
  },
};

@Directive()
export abstract class TeamListBaseComponent {
  readonly appRouteTitles = APP_ROUTE_TITLES;
  readonly appTitle = environment.appTitle;
  readonly photoVariant = CLOUDFLARE_VARIANT_SQUARE_100PX_NAME;
  readonly fallbackPhotoUrl = SRC_PHOTO_UNAVAILABLE_100PX;
  readonly contactLink = `/${APP_ROUTES.CONTACT}`;

  readonly currentMembers: TeamMember[];
  readonly pastMembers: TeamMember[];
  readonly currentMemberVms: MemberVm[];
  readonly pastMemberVms: MemberVm[];

  /**
   * The side column's Navigation buttons: the other team list, then About the
   * App and Supporters, in the order a member's own page lists them.
   */
  readonly navLinks: TeamNavLink[];

  protected readonly _routingService = inject(RoutingService);
  private readonly _memberRoute: string;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(group: TeamGroup, memberRoute: string) {
    this._memberRoute = memberRoute;
    this.currentMembers = TEAM_MEMBERS.filter(
      m => m.group === group && m.status === 'current',
    );
    this.pastMembers = TEAM_MEMBERS.filter(
      m => m.group === group && m.status === 'past',
    );
    this.currentMemberVms = this.currentMembers.map(m =>
      this._buildMemberVm(m),
    );
    this.pastMemberVms = this.pastMembers.map(m => this._buildMemberVm(m));

    const { route, label } = TEAM_CROSS_LINK_ROUTES[group];
    this.navLinks = [
      { link: this.getRouteLink(route), label },
      { link: this.getRouteLink(APP_ROUTES.ABOUT), label: 'About the App' },
      {
        link: this.getRouteLink(APP_ROUTES.ABOUT_SUPPORTERS),
        label: APP_ROUTE_TITLES.ABOUT_SUPPORTERS,
      },
    ];
  }

  getMemberLink(member: TeamMember): string {
    return `${this._routingService.getLink(this._memberRoute)}/${member.slug}`;
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  getThumbnailUrl(photoUrl?: string): string {
    if (!photoUrl) {
      return this.fallbackPhotoUrl;
    }
    return `${photoUrl}/${this.photoVariant}`;
  }

  private _buildMemberVm(member: TeamMember): MemberVm {
    return {
      member,
      link: this.getMemberLink(member),
      thumbnailUrl: this.getThumbnailUrl(member.photoUrl),
    };
  }
}
