import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { trustedYouTubeEmbed } from 'src/app/shared/media/youtube-embed.utility';

import { HelpGuideVideo } from '../help.models';

/** Where YouTube keeps each video's stills. */
const STILL_HOST = 'https://i.ytimg.com/vi';

/**
 * A guide's video, loaded only when a reader asks for it.
 *
 * Nothing is loaded from YouTube until the reader presses play, as with a
 * Chapter's video and a Custom Tracking one. Until then the page shows a still
 * from an image host that sets no cookies, so opening a guide does not tell
 * YouTube who read it. The player itself comes from `youtube-nocookie.com`,
 * through the one helper allowed to make an iframe source.
 */
@Component({
  selector: 'app-help-video',
  templateUrl: './help-video.component.html',
  standalone: true,
})
export class HelpVideoComponent {
  /** The video to show. */
  @Input({ required: true }) video!: HelpGuideVideo;

  /** Whether the reader has asked for playback. */
  isPlaying = false;

  /** Whether the full-size still turned out not to exist. */
  private _hasHdStill = true;

  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * The still to show before playback.
   *
   * The full-size one first, because the still fills the width of the guide.
   * YouTube makes it for most uploads but not all, and answers for the rest
   * with an error rather than a smaller picture, which `onStillMissing`
   * catches.
   *
   * @returns The still's address.
   */
  get stillSource(): string {
    const name = this._hasHdStill ? 'maxresdefault' : 'hqdefault';

    return `${STILL_HOST}/${this.video.videoId}/${name}.jpg`;
  }

  /**
   * The player's address, once the reader has asked for it.
   *
   * @returns The trusted address, or null before they have, or for an
   *   identifier that is not one.
   */
  get embedSource(): SafeResourceUrl | null {
    return this.isPlaying
      ? trustedYouTubeEmbed(this._sanitizer, this.video.videoId, {
          autoplay: true,
        })
      : null;
  }

  /**
   * The video's own page on YouTube, for a reader who would rather watch it
   * there.
   *
   * @returns The address.
   */
  get watchUrl(): string {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(
      this.video.videoId,
    )}`;
  }

  /**
   * Falls back to the still every video has, when the full-size one is not
   * one of them.
   */
  onStillMissing(): void {
    this._hasHdStill = false;
  }

  /**
   * Loads the player.
   */
  play(): void {
    this.isPlaying = true;
  }
}
