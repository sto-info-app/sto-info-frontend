import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, LcarsErrorMessageComponent],
})
export class TeamMemberComponent {
  readonly photoVariant = CLOUDFLARE_VARIANT_SQUARE_300PX_NAME;
  readonly fallbackPhotoUrl = SRC_PHOTO_UNAVAILABLE_300PX;

  member?: TeamMember;
  groupLabel = 'Team';
  teamGroup?: TeamGroup;

  /** Precomputed router link back to the member's group list page. */
  readonly groupLink: string;

  /** Precomputed router link to the About page. */
  readonly aboutLink = `/${APP_ROUTES.ABOUT}`;

  /** Precomputed router link to the Supporters page. */
  readonly supportersLink = `/${APP_ROUTES.ABOUT_SUPPORTERS}`;

  /** Precomputed photo URL for the member, falling back to the unavailable-photo asset. */
  readonly photoUrl: string;

  private readonly _route = inject(ActivatedRoute);
  private readonly _routingService = inject(RoutingService);

  constructor() {
    const slug = this._route.snapshot.paramMap.get('slug') ?? '';
    const group = this._route.snapshot.data['teamGroup'] as
      TeamGroup | undefined;

    this.member = TEAM_MEMBERS.find(
      member => member.slug === slug && member.group === group,
    );
    this.teamGroup = group;
    this.groupLabel = group === 'volunteers' ? 'Volunteers' : 'Developers';

    const groupRoute =
      group === 'volunteers'
        ? APP_ROUTES.ABOUT_VOLUNTEERS
        : APP_ROUTES.ABOUT_DEVELOPERS;
    this.groupLink = this._routingService.getLink(groupRoute);
    this.photoUrl = this.getMemberPhotoUrl(this.member?.photoUrl);
  }

  getGroupLink(): string {
    const route =
      this.teamGroup === 'volunteers'
        ? APP_ROUTES.ABOUT_VOLUNTEERS
        : APP_ROUTES.ABOUT_DEVELOPERS;
    return this._routingService.getLink(route);
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
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
