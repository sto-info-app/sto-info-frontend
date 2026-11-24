/**
 * Spoilers in a Storytime comment.
 *
 * A comment is plain text, and stays plain text: nothing here produces markup.
 * The body is only cut into pieces, each either ordinary words or words the
 * commenter wrapped in double bars to keep them from a reader who has not got
 * that far yet. The template decides how each piece is shown, so the text
 * never reaches the page by any route but interpolation.
 */

/** What a commenter types either side of a spoiler. */
export const SPOILER_MARKER = '||';

/**
 * The note under every box a comment is typed into.
 *
 * Quotes the marker as it is typed, because the marker is the whole of what
 * there is to know.
 */
export const SPOILER_HINT =
  'Wrap a spoiler in double bars, ||like this||, and it stays hidden until a reader chooses to see it.';

/**
 * A marked passage: the shortest run between two pairs of bars, across lines
 * if need be, so two spoilers in one sentence stay two.
 */
const SPOILER_PATTERN = /\|\|([\s\S]+?)\|\|/g;

/** One piece of a comment. */
export interface CommentSegment {
  /** The words, exactly as typed, without the bars. */
  text: string;

  /** Whether the words are hidden until a reader asks to see them. */
  isSpoiler: boolean;
}

/**
 * Cuts a comment into ordinary words and spoilers.
 *
 * A pair of bars with nothing but spaces between them hides nothing worth
 * hiding, and is left as the text it is; so are bars that are never closed.
 * Neither is an error: a commenter who typed them meant something, and
 * showing what they typed is the honest reading of it.
 *
 * @param body - The comment as written.
 * @returns Its pieces in order, with neighbouring ordinary words run together.
 */
export function splitSpoilers(body: string): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let plain = '';
  let from = 0;

  for (const match of body.matchAll(SPOILER_PATTERN)) {
    const hidden = match[1];

    if (hidden.trim() === '') {
      continue;
    }

    plain += body.slice(from, match.index);

    if (plain) {
      segments.push({ text: plain, isSpoiler: false });
      plain = '';
    }

    segments.push({ text: hidden, isSpoiler: true });
    from = match.index + match[0].length;
  }

  plain += body.slice(from);

  if (plain) {
    segments.push({ text: plain, isSpoiler: false });
  }

  return segments;
}
