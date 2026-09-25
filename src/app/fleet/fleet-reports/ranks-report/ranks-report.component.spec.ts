import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  cellsOf,
  configureReportView,
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  FleetRanksReport,
  FleetReport,
  FleetReportView,
  RanksExport,
} from 'src/app/models/fleet-report.models';

import { RanksReportComponent } from './ranks-report.component';

/** The changes an export revealed, every figure shown. */
const CHANGES = { promoted: 6, demoted: 5, changed: 7, acrossGap: 0 };

describe('RanksReportComponent', () => {
  let fixture: ComponentFixture<RanksReportComponent>;

  beforeEach(() => configureReportView(RanksReportComponent));

  /**
   * Draws the report.
   *
   * @param exports - Its exports.
   * @param view - How much the reader is shown.
   */
  function render(exports: RanksExport[], view = FleetReportView.FULL): void {
    const report: FleetRanksReport = {
      ...reportHeader(FleetReport.RANKS, view),
      exports,
    };

    fixture = TestBed.createComponent(RanksReportComponent);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
  }

  /** What the view says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /** The table. */
  const table = (): HTMLTableElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'table',
    ) as HTMLTableElement;

  /** The header row's cells' text. */
  const headings = (): string[] =>
    Array.from(table().querySelectorAll('th')).map(cell => textOf(cell).trim());

  /** Two exports: the Fleet's first, and one revealing changes. */
  const exports: RanksExport[] = [
    {
      export: exportOn(1),
      partial: false,
      labels: [
        { label: 'Admiral', tier: 1, members: 5 },
        { label: 'Captain', tier: 2, members: 20 },
        { label: 'Guest', tier: null, members: 8 },
      ],
      changes: null,
    },
    {
      export: exportOn(15),
      partial: true,
      labels: [
        { label: 'Captain', tier: 2, members: 22 },
        { label: 'Admiral', tier: 1, members: 6 },
        { label: 'Cadet', tier: null, members: 9 },
      ],
      changes: CHANGES,
    },
  ];

  it('orders the labels by the rank order, then the unplaced as first listed', () => {
    render(exports);

    expect(headings()).toEqual([
      'Export',
      'Admiral tier 1',
      'Captain tier 2',
      'Guest',
      'Cadet',
      'Promoted',
      'Demoted',
      'Changed',
      'Across a gap',
    ]);
  });

  it('counts each export’s members under each label, nobody where it listed none', () => {
    render(exports);

    expect(cellsOf(table())).toEqual([
      [
        'Nov 1, 2024, 12:00:00 PM',
        '5',
        '20',
        '8',
        '0',
        'The Fleet’s first export: nothing before it to change from',
      ],
      [
        'Nov 15, 2024, 12:00:00 PM partial',
        '6',
        '22',
        '0',
        '9',
        '6',
        '5',
        '7',
        '0',
      ],
    ]);
    expect(text()).toContain('only counted as changed');
  });

  it('draws the latest export’s labels', () => {
    render(exports);

    expect(text()).toContain('Ranks, as of Nov 15, 2024, 12:00:00 PM');
    expect(fixture.componentInstance.chart()).toEqual({
      data: [
        { name: 'Captain', count: 22 },
        { name: 'Admiral', count: 6 },
        { name: 'Cadet', count: 9 },
      ],
      hidden: 0,
    });
  });

  it('writes hidden counts as < 5, and leaves them out of the chart', () => {
    render(
      [
        {
          export: exportOn(15),
          partial: false,
          labels: [
            { label: 'Admiral', tier: 1, members: null },
            { label: 'Captain', tier: 2, members: 22 },
          ],
          changes: { promoted: null, demoted: null, changed: 7, acrossGap: 0 },
        },
      ],
      FleetReportView.AGGREGATE,
    );

    expect(cellsOf(table())).toEqual([
      ['Nov 15, 2024, 12:00:00 PM', '< 5', '22', '< 5', '< 5', '7', '0'],
    ]);
    expect(fixture.componentInstance.chart().data).toEqual([
      { name: 'Captain', count: 22 },
    ]);
    expect(text()).toContain('1 rank’s count is hidden, so not drawn.');
  });

  it('draws no chart when every label is hidden', () => {
    render(
      [
        {
          export: exportOn(15),
          partial: false,
          labels: [
            { label: 'Admiral', tier: 1, members: null },
            { label: 'Captain', tier: 2, members: null },
          ],
          changes: null,
        },
      ],
      FleetReportView.AGGREGATE,
    );

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).toBeNull();
    expect(text()).toContain('2 ranks’ counts are hidden');
  });

  it('says so when the span holds no export', () => {
    render([]);

    expect(fixture.componentInstance.chart()).toEqual({ data: [], hidden: 0 });
    expect(text()).toContain('No export was taken in this span.');
  });
});
