import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EndeavourRankBadgeComponent } from '../endeavour-rank-badge/endeavour-rank-badge.component';
import { AccountCardVm } from './account-card.model';

/**
 * An STO account card.
 *
 * Shared by the owner-facing dashboard account list and the public registry so
 * both render identically; callers vary only the `vm` they build — in
 * particular `actions`, which is empty for read-only contexts.
 */
@Component({
  selector: 'app-account-card',
  templateUrl: './account-card.component.html',
  styleUrls: ['./account-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, EndeavourRankBadgeComponent],
})
export class AccountCardComponent {
  @Input({ required: true }) vm!: AccountCardVm;

  /** Emits the `key` of the action button the user activated. */
  @Output() readonly action = new EventEmitter<string>();

  /**
   * Whether any detail row shows its label, which switches the body to a
   * two-column label/value grid so the values line up.
   *
   * @returns True when at least one detail row is visibly labelled.
   */
  get hasVisibleLabels(): boolean {
    return this.vm.details.some(detail => detail.showLabel);
  }

  /**
   * Emits an action, stopping the click from also triggering card navigation.
   *
   * @param key - The activated action's key.
   * @param event - The originating click event.
   */
  onAction(key: string, event: Event): void {
    event.stopPropagation();
    this.action.emit(key);
  }

  /**
   * Stops a nested link's click from also triggering card navigation.
   *
   * @param event - The originating click event.
   */
  onNestedLinkClick(event: Event): void {
    event.stopPropagation();
  }
}
