import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { RelationshipStatus } from '../../models/community.models';
import { RegistryProfileSummary } from '../../models/registry.models';
import { buildRegistryProfileLink } from '../registry-card.builders';

/**
 * The badge shown for a member the viewer already has a relationship with.
 */
interface RelationshipBadge {
  label: string;
  modifier: string;
}

/**
 * Badge copy per relationship. A member on either end of a block never reaches
 * a listing, so `BLOCKED` has no entry here.
 */
const RELATIONSHIP_BADGES: Partial<
  Record<RelationshipStatus, RelationshipBadge>
> = {
  [RelationshipStatus.SELF]: { label: 'You', modifier: 'self' },
  [RelationshipStatus.FRIENDS]: { label: 'Friend', modifier: 'friend' },
  [RelationshipStatus.REQUEST_SENT]: {
    label: 'Request sent',
    modifier: 'pending',
  },
  [RelationshipStatus.REQUEST_RECEIVED]: {
    label: 'Wants to be friends',
    modifier: 'pending',
  },
};

/**
 * A single registry member, as listed on the registry's list pages.
 *
 * Purely presentational: the card reports which action was pressed and the
 * list page performs it, so confirmation, reloading and error handling stay in
 * one place rather than being repeated per card.
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

  /** Whether the viewer is signed in, and so can act on this member. */
  @Input() canAct = false;

  /** Set while an action is in flight, so the buttons can be disabled. */
  @Input() isActing = false;

  /** Emits when the viewer asks to send this member a friend request. */
  @Output() readonly addFriend = new EventEmitter<RegistryProfileSummary>();

  /** Emits when the viewer accepts this member's pending request. */
  @Output() readonly acceptRequest = new EventEmitter<RegistryProfileSummary>();

  /** Emits when the viewer asks to end their friendship with this member. */
  @Output() readonly unfriend = new EventEmitter<RegistryProfileSummary>();

  /** Emits when the viewer asks to block this member. */
  @Output() readonly blockMember = new EventEmitter<RegistryProfileSummary>();

  relationshipStatus = RelationshipStatus;

  /**
   * The link to this member's public profile.
   *
   * @returns The profile path.
   */
  get profileLink(): string[] {
    return buildRegistryProfileLink(this.profile.username);
  }

  /**
   * The viewer's relationship to this member, when one was reported.
   *
   * @returns The relationship status, or null for an anonymous visitor.
   */
  get relationship(): RelationshipStatus | null {
    return this.profile.relationship?.status ?? null;
  }

  /**
   * The badge to show for the current relationship.
   *
   * @returns The badge, or null when there is nothing to indicate.
   */
  get badge(): RelationshipBadge | null {
    const status = this.relationship;
    return status ? (RELATIONSHIP_BADGES[status] ?? null) : null;
  }

  /**
   * Whether to reserve the badge row.
   *
   * Reserved whenever the viewer has relationships at all, so the rows below
   * line up across cards that do and do not carry a badge. Dropped entirely
   * for an anonymous visitor, where no card can ever have one and the reserved
   * row would just be a gap.
   *
   * @returns True when the row should be rendered.
   */
  get showBadgeSlot(): boolean {
    return this.relationship !== null;
  }

  /**
   * Whether to offer the actions row at all.
   *
   * Hidden from anonymous visitors and on the viewer's own card. A request the
   * viewer has already sent offers nothing either — withdrawing it is a
   * correction, not something to reach for from a browse listing.
   *
   * @returns True when at least one action applies.
   */
  get showActions(): boolean {
    return (
      this.canAct &&
      (this.relationship === this.relationshipStatus.NONE ||
        this.relationship === this.relationshipStatus.REQUEST_RECEIVED ||
        this.relationship === this.relationshipStatus.FRIENDS)
    );
  }
}
