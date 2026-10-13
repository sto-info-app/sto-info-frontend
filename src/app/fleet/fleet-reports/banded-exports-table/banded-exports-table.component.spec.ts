import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  BandedExport,
  BandedExportsTableComponent,
} from './banded-exports-table.component';

type Band = 'NEW' | 'OLD';

describe('BandedExportsTableComponent', () => {
  let fixture: ComponentFixture<BandedExportsTableComponent<Band>>;

  /**
   * Shows the table.
   *
   * @param exports - Its rows.
   */
  const show = (exports: BandedExport<Band>[]): void => {
    fixture = TestBed.createComponent(BandedExportsTableComponent<Band>);
    fixture.componentRef.setInput('caption', 'Each export, by band');
    fixture.componentRef.setInput('bands', ['NEW', 'OLD']);
    fixture.componentRef.setInput('bandLabels', { NEW: 'New', OLD: 'Old' });
    fixture.componentRef.setInput('exports', exports);
    fixture.componentRef.setInput('cohort', 5);
    fixture.detectChanges();
  };

  /** @returns The table as rendered. */
  const table = (): HTMLTableElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'table',
    ) as HTMLTableElement;

  /**
   * The text of each cell in a row.
   *
   * @param row - The row.
   * @returns Its cells' text, trimmed and with spaces collapsed.
   */
  const cells = (row: Element): string[] =>
    Array.from(row.children).map(cell =>
      (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  const exportOf = (importId: string, exportedAt: string) => ({
    importId,
    exportedAt,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BandedExportsTableComponent],
    });
  });

  it('heads a column for the export, its members and each band', () => {
    show([]);

    expect(table().caption?.textContent?.trim()).toBe('Each export, by band');
    expect(cells(table().tHead!.rows[0])).toEqual([
      'Export',
      'Members',
      'New',
      'Old',
    ]);
  });

  it('counts each export into the bands, hiding the smallest figures', () => {
    show([
      {
        export: exportOf('a', '2026-01-01T00:00:00Z'),
        partial: false,
        members: 1200,
        bands: { NEW: 1000, OLD: null },
      },
    ]);

    const [row] = Array.from(table().tBodies[0].rows);

    expect(cells(row).slice(1)).toEqual(['1,200', '1,000', '< 5']);
    expect(row.textContent).not.toContain('partial');
    expect(row.querySelectorAll('td')[2].getAttribute('data-label')).toBe(
      'New',
    );
  });

  it('marks a partial export, and says how many a band counts at least', () => {
    show([
      {
        export: exportOf('b', '2026-02-01T00:00:00Z'),
        partial: true,
        members: 30,
        bands: { NEW: 20, OLD: 10 },
        atLeast: { NEW: 0, OLD: 7 },
      },
    ]);

    const [row] = Array.from(table().tBodies[0].rows);

    expect(cells(row)[0]).toContain('partial');
    expect(cells(row).slice(2)).toEqual(['20', '10 7 at least']);
  });
});
