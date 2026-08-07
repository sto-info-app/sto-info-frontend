import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EntityAvatarComponent } from '../entity-avatar/entity-avatar.component';
import { MemberCardVm } from './member-card.model';

/**
 * A member card, as listed on the registry's list pages and the friends list.
 *
 * Purely presentational: the card reports which action was pressed and the page
 * listing it performs it, so confirmation, reloading and error handling stay in
 * one place rather than being repeated per card.
 */
@Component({
  selector: 'app-member-card',
  templateUrl: './member-card.component.html',
  styleUrls: ['./member-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, EntityAvatarComponent],
})
export class MemberCardComponent {
  @Input({ required: true }) vm!: MemberCardVm;

  /** Set while an action is in flight, so every button disables. */
  @Input() isActing = false;

  /** Emits the `key` of the action button the viewer activated. */
  @Output() readonly action = new EventEmitter<string>();
}
