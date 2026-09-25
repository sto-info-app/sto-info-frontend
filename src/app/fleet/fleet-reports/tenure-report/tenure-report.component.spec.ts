import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  cellsOf,
  configureReportView,
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  FleetReport,
  FleetReportView,
  FleetTenureReport,
  RosterTenureBand,
  TenureExport,
  TenureMember,
} from 'src/app/models/fleet-report.models';

import { TenureReportComponent } from './tenure-report.component';

/**
 * A tenure band record, one figure for each band.
 *
 * @param figures - The five figures, shortest band first.
 * @returns The record.
 */
function bands(
  ...figures: (number | null)[]
): Record<RosterTenureBand, number | null> {
  return {
    [RosterTenureBand.UNDER_30_DAYS]: figures[0],
    [RosterTenureBand.DAYS_30_TO_90]: figures[1],
    [RosterTenureBand.MONTHS_3_TO_12]: figures[2],
    [RosterTenureBand.YEARS_1_TO_2]: figures[3],
    [RosterTenureBand.OVER_2_YEARS]: figures[4],
  };
}

/**
 * One export's tenure, every figure shown.
 *
 * @param day - The export's day.
 * @param overrides - Figures to change.
 * @returns The export's row.
 */
function tenure(
  day: number,
  overrides: Partial<TenureExport> = {},
): TenureExport {
  return {
    export: exportOn(day),
    partial: false,
    members: 40,
    bands: bands(10, 10, 10, 5, 5),
    atLeast: bands(0, 0, 0, 0, 5),
    ...overrides,
  };
}

/** A member listed for over two years, as far as the exports go back. */
const KELL: TenureMember = {
  identityId: 'identity-kell',
  characterName: 'Kell Marr',
  accountHandle: '@fixture003',
  firstObservedAt: '2022-01-09T18:20:00.000Z',
  days: 1041,
  band: RosterTenureBand.OVER_2_YEARS,
  atLeast: true,
};

/** A member first listed three weeks before the export. */
const TALA: TenureMember = {
  identityId: 'identity-tala',
  characterName: 'Tala Vey',
  accountHandle: '@fixture004',
  firstObservedAt: '2024-10-25T12:00:00.000Z',
  days: 21,
  band: RosterTenureBand.UNDER_30_DAYS,
  atLeast: false,
};

describe('TenureReportComponent', () => {
  let fixture: ComponentFixture<TenureReportComponent>;

  beforeEach(() => configureReportView(TenureReportComponent));

  /**
   * Draws the report.
   *
   * @param overrides - Changes to a full report of two exports, detailed at
   *   the later.
   */
  function render(overrides: Partial<FleetTenureReport> = {}): void {
    const report: FleetTenureReport = {
      ...reportHeader(FleetReport.TENURE),
      exports: [tenure(1), tenure(15, { partial: true })],
      at: exportOn(15),
      members: [KELL, TALA],
      ...overrides,
    };

    fixture = TestBed.createComponent(TenureReportComponent);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
  }

  /** What the view says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /** The view's tables. */
  const tables = (): HTMLTableElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('table'),
    );

  /** The detail export's control. */
  const select = (): HTMLSelectElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('#tenure-at');

  it('bands each export’s members, saying how many had been listed at least that long', () => {
    render();

    expect(cellsOf(tables()[0])).toEqual([
      ['Nov 1, 2024, 12:00:00 PM', '40', '10', '10', '10', '5', '5 5 at least'],
      [
        'Nov 15, 2024, 12:00:00 PM partial',
        '40',
        '10',
        '10',
        '10',
        '5',
        '5 5 at least',
      ],
    ]);
    expect(text()).toContain('never the game’s Join Date');
  });

  it('lists the members at the detail export, longest listed first', () => {
    render();

    expect(cellsOf(tables()[1])).toEqual([
      [
        'Kell Marr@fixture003',
        'Jan 9, 2022, 6:20:00 PM',
        'at least 1,041',
        '2 years or more',
      ],
      [
        'Tala Vey@fixture004',
        'Oct 25, 2024, 1:00:00 PM',
        '21',
        'Under 30 days',
      ],
    ]);
  });

  it('offers every export in the span for the detail, newest first', () => {
    render();

    const options = Array.from(select()?.options ?? []);

    expect(options.map(option => [option.value, option.selected])).toEqual([
      ['import-15', true],
      ['import-01', false],
    ]);
  });

  it('asks for the members at the export the reader picks', () => {
    render();

    const asked: string[] = [];

    fixture.componentInstance.atChange.subscribe(importId =>
      asked.push(importId),
    );
    (select() as HTMLSelectElement).value = 'import-01';
    select()?.dispatchEvent(new Event('change'));

    expect(asked).toEqual(['import-01']);
  });

  it('draws the detail export', () => {
    render({
      at: exportOn(1),
      exports: [tenure(1), tenure(15, { bands: bands(1, 2, 3, 4, 5) })],
    });

    expect(text()).toContain('Listed for, as of Nov 1, 2024, 12:00:00 PM');
    expect(
      fixture.componentInstance.chart().data.map(bar => bar.count),
    ).toEqual([10, 10, 10, 5, 5]);
  });

  it('draws the latest export when there is no detail, or its export is not in the span', () => {
    render({ at: null, members: null });

    expect(text()).toContain('Listed for, as of Nov 15, 2024, 12:00:00 PM');

    render({ at: exportOn(29) });

    expect(text()).toContain('Listed for, as of Nov 15, 2024, 12:00:00 PM');
  });

  it('names nobody for an aggregate audience, and writes hidden counts as < 5', () => {
    render({
      ...reportHeader(FleetReport.TENURE, FleetReportView.AGGREGATE),
      exports: [
        tenure(15, {
          bands: bands(30, null, 5, null, 5),
          atLeast: bands(0, 0, 0, 0, null),
        }),
      ],
      at: null,
      members: null,
    });

    expect(cellsOf(tables()[0])).toEqual([
      [
        'Nov 15, 2024, 12:00:00 PM',
        '40',
        '30',
        '< 5',
        '5',
        '< 5',
        '5 < 5 at least',
      ],
    ]);
    expect(tables().length).toBe(1);
    expect(select()).toBeNull();
    expect(text()).toContain('2 bands’ counts are hidden, so not drawn.');
  });

  it('draws no chart when every band is hidden', () => {
    render({
      exports: [tenure(15, { bands: bands(null, null, null, null, null) })],
    });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).toBeNull();
    expect(text()).toContain('5 bands’ counts are hidden');
  });

  it('says so when the detail export listed nobody', () => {
    render({ members: [] });

    expect(text()).toContain('That export listed nobody.');
  });

  it('says so when the span holds no export', () => {
    render({ exports: [], at: null, members: null });

    expect(fixture.componentInstance.chart()).toEqual({ data: [], hidden: 0 });
    expect(text()).toContain('No export was taken in this span.');
  });
});
