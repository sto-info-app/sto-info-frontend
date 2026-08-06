import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { RegistryProfileSummary } from '../../models/registry.models';
import { buildRegistryProfileLink } from '../registry-card.builders';

/**
 * A single registry member, as listed on the registry's list pages.
 */
@Component({
  selector: 'app-registry-profile-card',
  templateUrl: './registry-profile-card.component.html',
  styleUrls: ['./registry-profile-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, EntityAvatarComponent],
})
export class RegistryProfileCardComponent {
  @Input({ required: true }) profile!: RegistryProfileSummary;

  /**
   * The link to this member's public profile.
   *
   * @returns The profile path.
   */
  get profileLink(): string[] {
    return buildRegistryProfileLink(this.profile.username);
  }
}
