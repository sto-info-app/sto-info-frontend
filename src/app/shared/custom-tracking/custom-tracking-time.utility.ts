/**
 * Reading stored instants and wall-clock times back in a named timezone.
 *
 * Shared between the editor in Settings and the read-only display on detail
 * pages, because the two are answering the same question. An editor that
 * reconstructed a local reading one way and a page that wrote it out another
 * would show a user two different times for the same stored value, and
 * whichever they saw last would be the one they believed.
 */

/** The timezone used where a definition somehow names none. */
const FALLBACK_TIMEZONE = 'UTC';

/**
 * The timezone a field's values are read in.
 *
 * @param configuration - The field's stored configuration.
 * @returns The IANA identifier the definition carries, or UTC where it
 *   somehow carries none.
 */
export function timezoneOf(configuration: Record<string, unknown>): string {
  const configured = configuration['defaultTimezone'];

  return typeof configured === 'string' && configured !== ''
    ? configured
    : FALLBACK_TIMEZONE;
}

/**
 * Writes an instant out as a local date and time in one timezone.
 *
 * The instant is what is stored, because only an instant can be compared; the
 * local reading is what the user entered and what they have to be shown.
 * Reconstructing one from the other is the whole reason the timezone is stored
 * alongside it.
 *
 * @param instant - The stored instant.
 * @param timezone - The IANA identifier to read it in.
 * @returns The local reading, as `YYYY-MM-DDTHH:mm`.
 */
export function localDateTimeIn(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));

  const held: Record<string, string> = {};

  for (const part of parts) {
    held[part.type] = part.value;
  }

  return `${held['year']}-${held['month']}-${held['day']}T${held['hour']}:${held['minute']}`;
}

/**
 * Rebuilds the address of a stored video.
 *
 * Only the identifier and the offset are kept, never the address somebody
 * pasted, so anything showing what is there has to write one out again.
 *
 * @param videoId - The stored identifier.
 * @param startSeconds - Where it starts, when it does not start at the front.
 * @returns A watch address for the video.
 */
export function youTubeAddress(
  videoId: string,
  startSeconds: number | null,
): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;

  return startSeconds === null ? base : `${base}&t=${startSeconds}s`;
}
