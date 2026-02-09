import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
  SRC_PHOTO_UNAVAILABLE_300PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { TeamGroup } from '../models/team-group.model';
import { TeamMember } from '../models/team-member.model';
import { TEAM_MEMBERS } from '../team.data';

@Component({
  selector: 'app-team-member',
  templateUrl: './team-member.component.html',
  styleUrls: ['./team-member.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, LcarsErrorMessageComponent],
})
export class TeamMemberComponent {
  appRoutes = APP_ROUTES;
  photoVariant = CLOUDFLARE_VARIANT_SQUARE_300PX_NAME;
  fallbackPhotoUrl = SRC_PHOTO_UNAVAILABLE_300PX;

  member?: TeamMember;
  groupLabel = 'Team';
  teamGroup?: TeamGroup;

  private readonly route = inject(ActivatedRoute);
  private readonly routingService = inject(RoutingService);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const group = this.route.snapshot.data['teamGroup'] as
      | TeamGroup
      | undefined;

    this.member = TEAM_MEMBERS.find(
      member => member.slug === slug && member.group === group,
    );
    this.teamGroup = group;
    this.groupLabel = group === 'volunteers' ? 'Volunteers' : 'Developers';
  }

  getGroupLink(): string {
    const route =
      this.teamGroup === 'volunteers'
        ? APP_ROUTES.ABOUT_VOLUNTEERS
        : APP_ROUTES.ABOUT_DEVELOPERS;
    return this.routingService.getLink(route);
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  getMemberPhotoUrl(photoUrl?: string): string {
    if (!photoUrl) {
      return this.fallbackPhotoUrl;
    }
    return `${photoUrl}/${this.photoVariant}`;
  }

  onPhotoError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target) {
      target.src = this.fallbackPhotoUrl;
    }
  }
}
