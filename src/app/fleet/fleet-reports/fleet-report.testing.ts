import { TestBed } from '@angular/core/testing';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  FleetReport,
  FleetReportHeader,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { RosterExportRef } from 'src/app/models/fleet-roster.models';

/**
 * An export taken at noon UTC on a day of November 2024.
 *
 * @param day - The day of the month.
 * @returns The export.
 */
export function exportOn(day: number): RosterExportRef {
  const dd = String(day).padStart(2, '0');

  return {
    importId: `import-${dd}`,
    exportedAt: `2024-11-${dd}T12:00:00.000Z`,
  };
}

/**
 * What every report says about itself, for a report read in one view.
 *
 * @param report - The report.
 * @param view - How much of it the reader is shown.
 * @returns The header.
 */
export function reportHeader(
  report: FleetReport,
  view: FleetReportView = FleetReportView.FULL,
): FleetReportHeader {
  return {
    report,
    view,
    revision: 17,
    publishedAt: '2026-09-25T02:09:15.000Z',
    stale: false,
    range: { from: null, to: null },
    coverage: { exports: 2, first: exportOn(1), latest: exportOn(15) },
    minimumCohort: 5,
  };
}

/**
 * Sets up a report view's test bed: every date is read in London.
 *
 * @param component - The view.
 */
export async function configureReportView(component: unknown): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [component as never],
    providers: [
      {
        provide: UserSettingsService,
        useValue: { displayTimezone: () => 'Europe/London' },
      },
    ],
  }).compileComponents();
}

/**
 * What an element says, however its template wraps the words.
 *
 * @param element - The element.
 * @returns Its text, each run of whitespace one space.
 */
export function textOf(element: Element): string {
  return String(element.textContent).replace(/\s+/g, ' ');
}

/**
 * Reads a table's cells, row by row.
 *
 * @param table - The table.
 * @returns Each body row's cells' text.
 */
export function cellsOf(table: Element): string[][] {
  return Array.from(table.querySelectorAll('tbody tr')).map(row =>
    Array.from(row.querySelectorAll('td')).map(cell =>
      // A cell always has text, if only an empty string.
      String(cell.textContent).replace(/\s+/g, ' ').trim(),
    ),
  );
}
