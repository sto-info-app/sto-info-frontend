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
import { TEAM_MEMBERS } from './team.data';

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
