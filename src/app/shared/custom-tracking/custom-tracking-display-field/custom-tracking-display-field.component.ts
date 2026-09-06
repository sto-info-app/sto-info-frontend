import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  CustomTrackingConfiguration,
  CustomTrackingEmptyMode,
} from 'src/app/models/custom-tracking.models';
import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';
import { trustedYouTubeEmbed } from 'src/app/shared/media/youtube-embed.utility';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';

import { CustomTrackingDisplayField } from '../custom-tracking-display.models';
import {
  CustomTrackingAnswerShape,
  CustomTrackingColourReading,
  CustomTrackingProgressReading,
  CustomTrackingRatingReading,
  CustomTrackingVideoReading,
  answerShape,
  answerText,
  colourReading,
  markdownSource,
  progressReading,
  ratingReading,
  videoReading,
} from '../custom-tracking-display.utility';

/**
 * One field's answer, drawn and never edited.
 *
 * The same component on all four surfaces — the owner's own account and
 * captain pages and the two public registry pages — because the question it
 * answers is the same one. Which fields reach it, and what is shown where one
 * has no answer, were both settled before it was called: by the server for a
 * visitor, and by the owner's own empty rule for the owner.
 *
 * There is nothing here to edit with, deliberately. Values are managed from
 * Settings alone, so a detail page offering a control would be offering one
 * that has nowhere to send what it collected.
 */
@Component({
  selector: 'app-custom-tracking-display-field',
  templateUrl: './custom-tracking-display-field.component.html',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
})
export class CustomTrackingDisplayFieldComponent {
  /** The field being drawn. */
  @Input({ required: true }) field!: CustomTrackingDisplayField;

  /** What the server says about the feature, once it has arrived. */
  @Input() configuration: CustomTrackingConfiguration | null = null;

  /** Whether the reader has asked to play the video, where there is one. */
  isPlaying = false;

  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * How this field's answer is drawn.
   *
   * @returns The shape the template renders.
   */
  get shape(): CustomTrackingAnswerShape {
    return answerShape(this.field);
  }

  /**
   * Whether the field has nothing recorded against it.
   *
   * @returns True when there is no answer.
   */
  get isEmpty(): boolean {
    return !this.field.answered;
  }

  /**
   * The words to show in place of a missing answer.
   *
   * Only where the field asks for them. A field reaches this point solely
   * because its reader is entitled to see it, so neither the label alone nor
   * the placeholder can betray that something hidden exists.
   *
   * @returns The placeholder, or an empty string.
   */
  get placeholder(): string {
    return this.field.emptyMode === CustomTrackingEmptyMode.SHOW_PLACEHOLDER
      ? (this.field.emptyPlaceholder ?? '')
      : '';
  }

  /**
   * The answer, for the types that come down to a line of text.
   *
   * @returns The written answer.
   */
  get text(): string {
    return answerText(this.field);
  }

  /**
   * The Markdown source, for a Markdown field.
   *
   * @returns The source.
   */
  get markdown(): string {
    return markdownSource(this.field);
  }

  /**
   * How far through something a progress field is.
   *
   * @returns The reading, or null.
   */
  get progress(): CustomTrackingProgressReading | null {
    return progressReading(this.field);
  }

  /**
   * The colour a colour field records.
   *
   * @returns The reading, or null.
   */
  get colour(): CustomTrackingColourReading | null {
    return colourReading(this.field, this.configuration?.palette ?? []);
  }

  /**
   * The marks a rating field fills in.
   *
   * @returns The reading, or null.
   */
  get rating(): CustomTrackingRatingReading | null {
    return ratingReading(this.field);
  }

  /**
   * The video a YouTube field records.
   *
   * @returns The reading, or null.
   */
  get video(): CustomTrackingVideoReading | null {
    return videoReading(this.field);
  }

  /**
   * The address the picture is fetched from.
   *
   * Built from the delivery variant the server names for the shape, so a
   * variant renamed in Cloudflare is corrected in one place. Empty until the
   * configuration arrives, or where it names no such shape — a guessed variant
   * yields a broken picture and no error anybody would notice.
   *
   * @returns The address, or an empty string.
   */
  get imageUrl(): string {
    const image = this.field.image;
    const spec = this.configuration?.imageShapes.find(
      shape => shape.shape === image?.shape,
    );

    return image && spec
      ? `${BASE_CLOUDFLARE_IMAGES_URL}/${image.imageId}/${spec.variant}`
      : '';
  }

  /**
   * The embed, once the reader has asked for it.
   *
   * Nothing is loaded from YouTube until they do. Until then the page shows a
   * still from an image host that sets no cookies, so reading somebody's
   * captain page does not announce the reader to YouTube.
   *
   * @returns The trusted embed address, or null.
   */
  get embedSource(): SafeResourceUrl | null {
    const video = this.video;

    if (!this.isPlaying || video === null) {
      return null;
    }

    return trustedYouTubeEmbed(this._sanitizer, video.videoId, {
      startSeconds: video.startSeconds,
      autoplay: true,
    });
  }

  /**
   * Loads the embed.
   */
  play(): void {
    this.isPlaying = true;
  }
}
