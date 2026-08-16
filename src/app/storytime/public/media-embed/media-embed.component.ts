import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChapterMedia } from 'src/app/models/storytime.models';

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
 * creator typed is ever loaded. It is marked trusted here because Angular
 * refuses an iframe source otherwise, and the value never passed through a
 * creator's hands.
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

  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * The embed source, once the reader has asked for it.
   *
   * @returns The trusted embed URL, or null before they have.
   */
  get embedSource(): SafeResourceUrl | null {
    if (!this.isPlaying) {
      return null;
    }

    // NOSONAR - built by the server from stored identifiers; see the class
    // comment. No creator-supplied text reaches this value.
    return this._sanitizer.bypassSecurityTrustResourceUrl(
      `${this.media.embedUrl}${this.media.embedUrl.includes('?') ? '&' : '?'}autoplay=1`,
    );
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
   * Loads the embed.
   */
  play(): void {
    this.isPlaying = true;
  }
}
