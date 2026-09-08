import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChapterMedia } from 'src/app/models/storytime.models';
import { trustedYouTubeEmbedUrl } from 'src/app/shared/media/youtube-embed.utility';

/**
 * One embedded video, loaded only when a reader asks for it.
 *
 * Nothing is loaded from YouTube until the reader presses play. Until then the
 * page shows a still from an image host that sets no cookies, so opening a
 * Chapter does not tell YouTube who read it. That is the whole point of this
 * component: an iframe rendered on load would announce every reader before
 * they had decided to watch anything.
 *
 * The embed URL is built by the server from stored identifiers, so nothing a
 * creator typed is ever loaded. Marking it trusted, and refusing anything that
 * is not a YouTube embed, is the shared helper's job — the same one the custom
 * tracking display uses, because there should be exactly one place where a
 * stored string is allowed to become an iframe source.
 */
@Component({
  selector: 'app-media-embed',
  templateUrl: './media-embed.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class MediaEmbedComponent {
  /** The video to show. */
  @Input({ required: true }) media!: ChapterMedia;

  /** Whether the reader has asked for playback. */
  isPlaying = false;

  /** Whether the full-size still turned out not to exist. */
  private _hasHdThumbnail = true;

  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * The still to show before playback.
   *
   * The full-size one is asked for first, because the still is shown at the
   * width of the Chapter and the size YouTube holds for every video would be
   * stretched to nearly twice its own. YouTube produces the full-size still
   * for most uploads but not all, and answers for the ones it does not with
   * an error rather than a smaller picture — so the miss is what
   * `onThumbnailMissing` is for.
   *
   * @returns The still's address.
   */
  get thumbnailSource(): string {
    return this._hasHdThumbnail
      ? this.media.thumbnailHdUrl
      : this.media.thumbnailUrl;
  }

  /**
   * The embed source, once the reader has asked for it.
   *
   * @returns The trusted embed URL, or null before they have.
   */
  get embedSource(): SafeResourceUrl | null {
    return this.isPlaying
      ? trustedYouTubeEmbedUrl(this._sanitizer, this.media.embedUrl, true)
      : null;
  }

  /**
   * What to announce the video as.
   *
   * @returns The creator's title, or a plain description.
   */
  get label(): string {
    return this.media.title ?? 'Embedded video';
  }

  /**
   * What the panel's bar calls the video.
   *
   * Shorter than the name a screen reader is given, because the bar is read
   * alongside the picture underneath it: "Embedded video" over an embedded
   * video says nothing that is not already on the screen.
   *
   * @returns The creator's title, or what the panel holds.
   */
  get panelName(): string {
    return this.media.title ?? 'Video';
  }

  /**
   * Falls back to the still every video has, when the full-size one is not
   * one of them.
   *
   * The reader sees the smaller picture rather than a broken image, which is
   * the whole reason the two are offered separately.
   */
  onThumbnailMissing(): void {
    this._hasHdThumbnail = false;
  }

  /**
   * Loads the embed.
   */
  play(): void {
    this.isPlaying = true;
  }
}
