/**
 * What Storytime's Markdown actually understands.
 *
 * Every piece of Storytime writing — a Chapter, a Story or Arc description, a
 * Character's biography — goes through one renderer on the server, and that
 * renderer accepts a deliberately small, closed set of constructs. Anything
 * outside the set is shown exactly as it was typed.
 *
 * That is fine until somebody tries a table, sees a row of pipe characters,
 * and cannot tell whether they wrote it wrongly or whether tables are simply
 * not a thing here. This is the answer to that question, held as data so the
 * editors and the help section give the same one.
 *
 * Kept in step with `StorytimeMarkdownService` on the server, which is the
 * authority. A construct listed here that the renderer does not have is worse
 * than one that is missing, because somebody will rely on it.
 */

/** One thing a creator can write, and what it produces. */
export interface MarkdownConstruct {
  /** What is typed, shown as written. */
  syntax: string;

  /** What comes out, and anything worth knowing about it. */
  meaning: string;
}

/** A group of related constructs, as the reference presents them. */
export interface MarkdownReferenceGroup {
  /** What the group is called. */
  heading: string;

  /** What the group as a whole is for, and the rule that governs all of it. */
  intro: string;

  /** The constructs in it, in the order they are most likely wanted. */
  constructs: readonly MarkdownConstruct[];
}

/**
 * The reference itself.
 *
 * Ordered by how often a writer reaches for each: emphasis before structure,
 * structure before links, because most Storytime writing is prose.
 */
export const MARKDOWN_REFERENCE: readonly MarkdownReferenceGroup[] = [
  {
    heading: 'Within a line',
    intro:
      'These work anywhere in a sentence, and can be used inside one another.',
    constructs: [
      { syntax: '**bold**', meaning: 'Bold text.' },
      { syntax: '__bold__', meaning: 'Bold text, written the other way.' },
      { syntax: '*italic*', meaning: 'Italic text.' },
      { syntax: '_italic_', meaning: 'Italic text, written the other way.' },
      {
        syntax: '`fixed width`',
        meaning:
          'Fixed-width text, shown exactly as typed. Useful for a computer’s own words.',
      },
    ],
  },
  {
    heading: 'Blocks',
    intro:
      'These shape a whole block rather than a phrase, so each needs a blank line above and below it. Every line of the block has to fit the shape: a list with one line that is not an item is not a list, and comes out as an ordinary paragraph.',
    constructs: [
      {
        syntax: '# A heading',
        meaning:
          'A heading, on a line of its own. ## down to ###### give smaller ones. Inside a Chapter every heading drops a level, so the Chapter’s own title stays the largest thing on the page.',
      },
      {
        syntax: '- An item',
        meaning:
          'A bulleted list. * and + do the same. Every line of the block has to be an item.',
      },
      {
        syntax: '1. An item',
        meaning:
          'A numbered list. Every line of the block has to be numbered; the numbers themselves are not read, so 1. on every line still counts up.',
      },
      {
        syntax: '> A quotation',
        meaning:
          'A quotation. Every line of the block needs its own >, and the lines are run together as one.',
      },
      {
        syntax: '```',
        meaning:
          'Opens and closes a block of code or preformatted text. Nothing between the fences is formatted, which is the way to show Markdown itself.',
      },
      {
        syntax: '---',
        meaning:
          'A dividing line, on a line of its own. *** and ___ do the same.',
      },
    ],
  },
  {
    heading: 'Links',
    intro:
      'A link may point at another page on this site, or at a numbered block on the page it is already on. Nothing published in Storytime links off the site — an address that leaves it is not refused, it simply never becomes a link.',
    constructs: [
      {
        syntax: '[the archive](/storytime/stories)',
        meaning: 'A link to another page on this site.',
      },
      {
        syntax: '[the opening](#b1)',
        meaning: 'A link to a numbered block on the page you are already on.',
      },
      {
        syntax: '[a label](https://example.com)',
        meaning:
          'Removed when the writing is shown, label and all. Nothing published here links off the site, and a label with nothing behind it reads as a broken promise.',
      },
      {
        syntax: 'https://example.com',
        meaning:
          'Left exactly as typed, as ordinary text rather than a link. A reader can still see where you meant.',
      },
    ],
  },
];

/**
 * The things a reference table cannot say in a column.
 *
 * The first is the mistake almost everybody makes once; the rest are the
 * answers to "why did nothing happen".
 */
export const MARKDOWN_REFERENCE_NOTES: readonly string[] = [
  'Leave a blank line between blocks. A heading, a list, a quotation or a dividing line has to stand as a block of its own, and a single line break inside a paragraph is kept as a line break.',
  'Anything not listed here is shown exactly as you typed it, HTML included. Nothing you write can become part of the page itself.',
  'There are no tables, images or nested lists.',
];
