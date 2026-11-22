import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Small counts written as words, so the phrase is spoken rather than spelled.
 *
 * Anything past this is said as a numeral. A name with six spaces at one end
 * is a name somebody is making a point with, and "6" is clearer there than a
 * word would be.
 */
const COUNT_WORDS: readonly string[] = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
];

/**
 * Writes out how many spaces sit at one edge, for a reader who cannot see them.
 *
 * @param count - How many spaces.
 * @param edge - Which edge they are at.
 * @returns The phrase, or null when there are none.
 */
function edgePhrase(count: number, edge: string): string | null {
  if (count === 0) {
    return null;
  }

  const written = COUNT_WORDS[count] ?? String(count);

  return count === 1 ? `${written} ${edge} space` : `${written} ${edge} spaces`;
}

/**
 * A Fleet or Armada name exactly as the game holds it, edge spaces and all.
 *
 * A space at either end of an in-game name is part of the name (ADR-0003), and
 * it may be the only thing telling two records apart — the game lets two
 * different Fleets be called "Alpha Quadrant Alliance" and "Alpha Quadrant
 * Alliance ". HTML collapses a space at either end of a run of text to
 * nothing, so a template writing the name out plainly draws those two Fleets
 * identically, and a reader choosing between them has nothing to choose on.
 *
 * Each edge space is therefore drawn as a mark of its own, and counted out in
 * the accessible name as well, because a screen reader announces a space no
 * more loudly than a browser draws one.
 *
 * The core keeps `pre-wrap`, so a run of spaces *inside* the name stays as
 * wide as it was written. Those are not marked: a space between two words is
 * visible as a gap already, where an edge space has nothing beside it to be a
 * gap between.
 */
@Component({
  selector: 'app-fleet-exact-name',
  templateUrl: './fleet-exact-name.component.html',
  styleUrls: ['./fleet-exact-name.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetExactNameComponent {
  /** One entry per leading space, so two of them draw as two marks. */
  leadingSpaces: readonly number[] = [];

  /** The name with its edge spaces taken off. */
  core = '';

  /** One entry per trailing space. */
  trailingSpaces: readonly number[] = [];

  /** The whole name said as one phrase, spaces counted out. */
  ariaLabel = '';

  /**
   * The name to draw, exactly as recorded.
   *
   * Taken apart on the way in rather than in a getter, so the work happens
   * once per name rather than once per change detection pass.
   */
  @Input({ required: true }) set name(value: string) {
    this.core = value.trim();

    // A name that is nothing but spaces trims to nothing from both ends, and
    // counting each end separately would draw every space twice. They are all
    // called leading: there is no core for them to be on either side of.
    const leading =
      this.core === '' ? value.length : value.length - value.trimStart().length;
    const trailing =
      this.core === '' ? 0 : value.length - value.trimEnd().length;

    this.leadingSpaces = Array.from({ length: leading }, (_, index) => index);
    this.trailingSpaces = Array.from({ length: trailing }, (_, index) => index);
    this.ariaLabel = this.describe(value);
  }

  /**
   * Says the name and then its edge spaces, when it has any.
   *
   * @param value - The name as recorded.
   * @returns What a screen reader should announce.
   */
  private describe(value: string): string {
    const edges = [
      edgePhrase(this.leadingSpaces.length, 'leading'),
      edgePhrase(this.trailingSpaces.length, 'trailing'),
    ].filter((phrase): phrase is string => phrase !== null);

    if (edges.length === 0) {
      return value;
    }

    // The trimmed core rather than the raw name: a screen reader reads the raw
    // one out identically with or without its spaces, which is the whole
    // problem this is here to solve.
    return `${this.core}, with ${edges.join(' and ')}`;
  }
}
