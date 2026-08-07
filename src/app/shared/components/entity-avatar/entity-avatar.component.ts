import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  SRC_PHOTO_UNAVAILABLE_100PX,
  SRC_PHOTO_UNAVAILABLE_300PX,
} from '../../constants/app-image-assets.constants';

/** The avatar sizes this component renders. */
export type EntityAvatarSize = 100 | 300;

/**
 * Renders a profile picture with a size-matched placeholder fallback.
 *
 * Pages previously open-coded an `<img>` plus an `(error)` handler and repeated
 * the placeholder URL each time; this keeps that in one place.
 */
@Component({
  selector: 'app-entity-avatar',
  templateUrl: './entity-avatar.component.html',
  styleUrls: ['./entity-avatar.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class EntityAvatarComponent {
  private _src: string | null = null;

  /** The resolved image URL, or null to show the placeholder immediately. */
  @Input()
  set src(value: string | null) {
    this._src = value;
    this.hasFailed = false;
  }

  get src(): string | null {
    return this._src;
  }

  /** Accessible description of the image. */
  @Input({ required: true }) alt!: string;

  /** Which placeholder variant to fall back to. */
  @Input() size: EntityAvatarSize = 100;

  /** Set once the supplied image has failed to load. */
  hasFailed = false;

  /**
   * Falls back to the placeholder when the supplied image cannot be loaded.
   */
  onImageError(): void {
    this.hasFailed = true;
  }

  /**
   * The image URL to render, accounting for a missing or broken source.
   *
   * @returns The image URL to display.
   */
  get displaySrc(): string {
    if (this._src && !this.hasFailed) {
      return this._src;
    }

    return this.size === 300
      ? SRC_PHOTO_UNAVAILABLE_300PX
      : SRC_PHOTO_UNAVAILABLE_100PX;
  }
}
