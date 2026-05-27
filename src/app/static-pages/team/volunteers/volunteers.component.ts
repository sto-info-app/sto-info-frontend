import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
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
import { TeamMember } from '../models/team-member.model';
import { TEAM_MEMBERS } from '../team.data';

/** Precomputed view model for a team member card in the volunteers list. */
export interface MemberVm {
  member: TeamMember;
  /** Absolute router link to the member detail page. */
  link: string;
  /** Resolved thumbnail URL, falling back to the unavailable-photo asset. */
  thumbnailUrl: string;
}

@Component({
  selector: 'app-team-volunteers',
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
})
export class TeamVolunteersComponent {
  appRouteTitles = APP_ROUTE_TITLES;
  appTitle = environment.appTitle;
  readonly photoVariant = CLOUDFLARE_VARIANT_SQUARE_100PX_NAME;
  readonly fallbackPhotoUrl = SRC_PHOTO_UNAVAILABLE_100PX;

  readonly currentMembers = TEAM_MEMBERS.filter(
    member => member.group === 'volunteers' && member.status === 'current',
  );
  readonly pastMembers = TEAM_MEMBERS.filter(
    member => member.group === 'volunteers' && member.status === 'past',
  );

  /** Precomputed view models for current volunteer members. */
  readonly currentMemberVms: MemberVm[];

  /** Precomputed view models for past volunteer members. */
  readonly pastMemberVms: MemberVm[];

  /** Precomputed router link to the contact page. */
  readonly contactLink = `/${APP_ROUTES.CONTACT}`;

  private readonly _routingService = inject(RoutingService);

  constructor() {
    this.currentMemberVms = this.currentMembers.map(member =>
      this._buildMemberVm(member),
    );
    this.pastMemberVms = this.pastMembers.map(member =>
      this._buildMemberVm(member),
    );
  }

  getMemberLink(member: TeamMember): string {
    return `${this._routingService.getLink(APP_ROUTES.ABOUT_VOLUNTEERS)}/${member.slug}`;
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
