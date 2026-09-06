import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Building the one kind of iframe source this site will load.
 *
 * Angular refuses an iframe source outright unless it is marked trusted, so
 * something has to mark one — and the safe way to do that is to check the
 * address first and refuse anything that is not a YouTube embed. That check
 * lives here, once, because it is the only thing standing between a stored
 * string and an iframe: two copies of it would be two chances for one to be
 * relaxed while the other was audited.
 */

/** The hosts an embed may be loaded from, and no others. */
const EMBED_HOSTS = [
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
];

/** The host an embed is built for, which sets no cookies until playback. */
const NO_COOKIE_HOST = 'https://www.youtube-nocookie.com';

/** The eleven characters a YouTube identifier is made of, and nothing else. */
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** How an embed is asked for. */
export interface YouTubeEmbedOptions {
  /** Where the video starts, when it does not start at the front. */
  startSeconds?: number | null;
  /** Whether playback begins as soon as the frame loads. */
  autoplay?: boolean;
}

/**
 * Marks an embed address trusted, having first checked that it is one.
 *
 * @param sanitizer - Angular's sanitizer.
 * @param address - The address to load.
 * @param autoplay - Whether playback begins as soon as the frame loads.
 * @returns The trusted address, or null where it is not a YouTube embed.
 */
export function trustedYouTubeEmbedUrl(
  sanitizer: DomSanitizer,
  address: string,
  autoplay: boolean,
): SafeResourceUrl | null {
  let embedUrl: URL;

  try {
    embedUrl = new URL(address);
  } catch {
    return null;
  }

  if (
    embedUrl.protocol !== 'https:' ||
    !EMBED_HOSTS.includes(embedUrl.hostname)
  ) {
    return null;
  }

  const url = autoplay
    ? `${embedUrl}${embedUrl.search ? '&' : '?'}autoplay=1`
    : `${embedUrl}`;

  // NOSONAR - the address is restricted to HTTPS YouTube origins above.
  return sanitizer.bypassSecurityTrustResourceUrl(url);
}

/**
 * Builds an embed address from a stored identifier and marks it trusted.
 *
 * The identifier is checked against the eleven characters one is made of
 * before any address is built from it. It came from the server's own parser
 * and should never be anything else, but assembling a URL from a stored string
 * is exactly where "should never" stops being good enough.
 *
 * @param sanitizer - Angular's sanitizer.
 * @param videoId - The stored identifier.
 * @param options - Where to start, and whether to play at once.
 * @returns The trusted address, or null where the identifier is not one.
 */
export function trustedYouTubeEmbed(
  sanitizer: DomSanitizer,
  videoId: string,
  options: YouTubeEmbedOptions = {},
): SafeResourceUrl | null {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  const parameters = new URLSearchParams();

  if (options.startSeconds !== null && options.startSeconds !== undefined) {
    parameters.set('start', String(options.startSeconds));
  }

  const query = parameters.toString();

  return trustedYouTubeEmbedUrl(
    sanitizer,
    `${NO_COOKIE_HOST}/embed/${videoId}${query ? `?${query}` : ''}`,
    options.autoplay === true,
  );
}
