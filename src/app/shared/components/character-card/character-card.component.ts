import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../../constants/app-image-assets.constants';
import { CharacterCardVm } from './character-card.model';

/**
 * A captain card.
 *
 * Shared by the owner-facing account detail page and the public registry so
 * both render identically; callers vary only the `vm` they build — in
 * particular `actions`, which is empty for read-only contexts.
 *
 * The card owns its own broken-image fallback, so callers no longer need to
 * track failed image ids themselves.
 */
@Component({
  selector: 'app-character-card',
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class CharacterCardComponent {
  @Input({ required: true }) vm!: CharacterCardVm;

  /** Emits the `key` of the action button the user activated. */
  @Output() readonly action = new EventEmitter<string>();

  /** Set once the captain's profile image has failed to load. */
  hasImageFailed = false;

  /**
   * Falls back to the placeholder when the profile image cannot be loaded.
   */
  onImageError(): void {
    this.hasImageFailed = true;
  }

  /**
   * The profile image to render, accounting for a missing or broken source.
   *
   * @returns The image URL to display.
   */
  get imageSrc(): string {
    if (this.vm.imageUrl && !this.hasImageFailed) {
      return this.vm.imageUrl;
    }

    return SRC_PHOTO_UNAVAILABLE_300PX;
  }

  /**
   * The header label, appending the level when one is recorded.
   *
   * @returns The captain's display name for the card header.
   */
  get headerLabel(): string {
    return this.vm.level === null
      ? this.vm.handle
      : `${this.vm.handle} (Lvl ${this.vm.level})`;
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
}
