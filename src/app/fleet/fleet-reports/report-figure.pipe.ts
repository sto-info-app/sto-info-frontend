import { Pipe, PipeTransform } from '@angular/core';

/**
 * Writes one of a report's figures (FC-020).
 *
 * A figure an aggregate view hid comes as null, and is written as the CSV
 * writes it — `< 5` — so a reader is told something is there, and roughly
 * how little, without being told what. A contribution total comes as a
 * decimal string, since it can be larger than a JavaScript number holds
 * exactly.
 */
@Pipe({
  name: 'reportFigure',
  standalone: true,
})
export class ReportFigurePipe implements PipeTransform {
  /**
   * Writes a figure.
   *
   * @param value - The figure: a count, a decimal string, or null if hidden.
   * @param minimumCohort - The fewest members a figure may count.
   * @returns It, with its thousands separated, or `< 5`.
   */
  transform(value: number | string | null, minimumCohort: number): string {
    if (value === null) {
      return `< ${minimumCohort}`;
    }

    return (typeof value === 'string' ? BigInt(value) : value).toLocaleString(
      'en-GB',
    );
  }
}
