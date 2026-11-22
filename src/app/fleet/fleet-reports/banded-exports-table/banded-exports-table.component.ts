import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ReportFigurePipe } from 'src/app/fleet/fleet-reports/report-figure.pipe';
import { RosterExportRef } from 'src/app/models/fleet-roster.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** One export's members, counted into bands (FC-020). */
export interface BandedExport<B extends string> {
  /** The export. */
  export: RosterExportRef;
  /** Whether it listed only some of the Fleet. */
  partial: boolean;
  /** How many members it listed, or null if hidden. */
  members: number | null;
  /** How many fell into each band, or null if hidden. */
  bands: Readonly<Record<B, number | null>>;
  /**
   * Of each band, those no earlier export bounds, who were in it at least,
   * when the report counts them.
   */
  atLeast?: Readonly<Record<B, number | null>>;
}

/**
 * A table of exports, each counted into the same bands (FC-020).
 *
 * The Activity and Tenure reports both read this way: an export a row, its
 * members, then a column for each band. A band that counts some members at
 * least says how many. Its host takes no box of its own, so the table sits
 * in the report exactly as the markup it replaces did.
 */
@Component({
  selector: 'app-banded-exports-table',
  templateUrl: './banded-exports-table.component.html',
  styleUrls: ['./banded-exports-table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, ReportFigurePipe],
})
export class BandedExportsTableComponent<B extends string> {
  /** What the table shows, for its caption. */
  readonly caption = input.required<string>();

  /** The bands, in column order. */
  readonly bands = input.required<readonly B[]>();

  /** What each band is called. */
  readonly bandLabels = input.required<Readonly<Record<B, string>>>();

  /** The exports, a row each. */
  readonly exports = input.required<readonly BandedExport<B>[]>();

  /** The fewest members a figure may count before it is hidden. */
  readonly cohort = input.required<number>();
}
