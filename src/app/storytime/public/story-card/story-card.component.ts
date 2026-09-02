import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  CONTENT_RATING_LABELS,
  ContentRating,
  Story,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeTagRowComponent } from '../../shared/tag-row/tag-row.component';
import { COMPLETION_STATE_LABELS } from '../../storytime.constants';

/**
 * A Story summarised for a listing.
 *
 * Artwork is optional throughout Storytime, so the card renders no image at all
 * when a Story has none — no placeholder, no empty frame — and the layout
 * closes up around it.
 */
@Component({
  selector: 'app-story-card',
  templateUrl: './story-card.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, StorytimeTagRowComponent],
})
export class StoryCardComponent {
  /** The Story to summarise. */
  @Input({ required: true }) story!: Story;

  /** Route constants for the link to the Story. */
  readonly appRoutes = APP_ROUTES;

  /** Rating labels, so a raw enum value is never shown. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** Completion labels, so a raw enum value is never shown. */
  readonly completionLabels = COMPLETION_STATE_LABELS;

  /**
   * Whether the rating deserves a warning badge.
   *
   * @returns True for Mature and Adults Only.
   */
  get needsRatingWarning(): boolean {
    return this.story.contentRating !== ContentRating.GENERAL;
  }
}
