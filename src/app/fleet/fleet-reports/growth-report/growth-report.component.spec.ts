import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  cellsOf,
  configureReportView,
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  FleetGrowthReport,
  FleetReport,
  FleetReportView,
  GrowthInterval,
} from 'src/app/models/fleet-report.models';

import { GrowthReportComponent } from './growth-report.component';

/**
 * One interval, every figure shown.
 *
 * @param fromDay - The earlier export's day.
 * @param toDay - The later export's day.
 * @param overrides - Figures to change.
 * @returns The interval.
 */
function interval(
  fromDay: number,
  toDay: number,
  overrides: Partial<GrowthInterval> = {},
): GrowthInterval {
  return {
    from: exportOn(fromDay),
    to: exportOn(toDay),
    partial: false,
    membersAtStart: 1200,
    membersAtEnd: 1210,
    joined: 14,
    rejoined: 6,
    left: 10,
    unknown: 0,
    acrossGap: 2,
    accountsAtStart: 900,
    accountsAtEnd: 905,
    ...overrides,
  };
}

describe('GrowthReportComponent', () => {
  let fixture: ComponentFixture<GrowthReportComponent>;

  beforeEach(() => configureReportView(GrowthReportComponent));

  /**
   * Draws the report.
   *
   * @param intervals - Its intervals.
   * @param view - How much the reader is shown.
   */
  function render(
    intervals: GrowthInterval[],
    view = FleetReportView.FULL,
  ): void {
    const report: FleetGrowthReport = {
      ...reportHeader(FleetReport.GROWTH, view),
      intervals,
    };

    fixture = TestBed.createComponent(GrowthReportComponent);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
  }

  /** What the view says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /** The table's cells. */
  const cells = (): string[][] =>
    cellsOf(
      (fixture.nativeElement as HTMLElement).querySelector(
        'table',
      ) as HTMLTableElement,
    );

  it('lists each interval, dated by its two exports alone', () => {
    render([interval(1, 15), interval(15, 29, { partial: true })]);

    expect(cells()).toEqual([
      [
        'Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM',
        '1,200 → 1,210',
        '14',
        '6',
        '10',
        '0',
        '2',
        '900 → 905',
      ],
      [
        'Nov 15, 2024, 12:00:00 PM and Nov 29, 2024, 12:00:00 PM the later export was partial',
        '1,200 → 1,210',
        '14',
        '6',
        '10',
        '0',
        '2',
        '900 → 905',
      ],
    ]);
    expect(text()).toContain('Account handles are those listed, never people');
  });

  it('draws the members at the end of each interval', () => {
    render([interval(1, 15), interval(15, 29, { membersAtEnd: 1220 })]);

    expect(fixture.componentInstance.chart()).toEqual({
      data: [
        { name: 'Nov 15, 2024', count: 1210 },
        { name: 'Nov 29, 2024', count: 1220 },
      ],
      hidden: 0,
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).not.toBeNull();
    expect(text()).not.toContain('hidden, so not drawn');
  });

  it('writes a hidden count as < 5, and leaves it out of the chart', () => {
    render(
      [
        interval(1, 15, {
          membersAtStart: null,
          membersAtEnd: null,
          joined: null,
          accountsAtStart: null,
          accountsAtEnd: null,
        }),
        interval(15, 29),
      ],
      FleetReportView.AGGREGATE,
    );

    expect(cells()[0]).toEqual([
      'Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM',
      '< 5 → < 5',
      '< 5',
      '6',
      '10',
      '0',
      '2',
      '< 5 → < 5',
    ]);
    expect(fixture.componentInstance.chart().data).toEqual([
      { name: 'Nov 29, 2024', count: 1210 },
    ]);
    expect(text()).toContain('1 interval’s count is hidden, so not drawn.');
  });

  it('draws no chart when every count is hidden', () => {
    render(
      [
        interval(1, 15, { membersAtEnd: null }),
        interval(15, 29, { membersAtEnd: null }),
      ],
      FleetReportView.AGGREGATE,
    );

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).toBeNull();
    expect(text()).toContain('2 intervals’ counts are hidden, so not drawn.');
  });

  it('says so when the span holds no interval', () => {
    render([]);

    expect(text()).toContain('There are not two exports in this span');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table'),
    ).toBeNull();
  });
});
