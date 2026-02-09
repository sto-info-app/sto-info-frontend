import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-team-volunteers',
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class TeamVolunteersComponent {
  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;
  appTitle = environment.appTitle;
  photoVariant = CLOUDFLARE_VARIANT_SQUARE_100PX_NAME;
  fallbackPhotoUrl = SRC_PHOTO_UNAVAILABLE_100PX;

  currentMembers = TEAM_MEMBERS.filter(
    member => member.group === 'volunteers' && member.status === 'current',
  );
  pastMembers = TEAM_MEMBERS.filter(
    member => member.group === 'volunteers' && member.status === 'past',
  );

  private readonly routingService = inject(RoutingService);

  getMemberLink(member: TeamMember): string {
    return `${this.routingService.getLink(APP_ROUTES.ABOUT_VOLUNTEERS)}/${member.slug}`;
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  getThumbnailUrl(photoUrl?: string): string {
    if (!photoUrl) {
      return this.fallbackPhotoUrl;
    }
    return `${photoUrl}/${this.photoVariant}`;
  }
}
