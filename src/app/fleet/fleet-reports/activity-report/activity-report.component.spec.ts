import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  cellsOf,
  configureReportView,
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  ActivityExport,
  FleetActivityReport,
  FleetReport,
  FleetReportView,
  RosterActivityBand,
} from 'src/app/models/fleet-report.models';

import { ActivityReportComponent } from './activity-report.component';

/**
 * One export's activity, every figure shown.
 *
 * @param day - The export's day.
 * @param overrides - Figures to change.
 * @returns The export's row.
 */
function activity(
  day: number,
  overrides: Partial<ActivityExport> = {},
): ActivityExport {
  return {
    export: exportOn(day),
    partial: false,
    members: 40,
    bands: {
      [RosterActivityBand.WITHIN_7_DAYS]: 20,
      [RosterActivityBand.WITHIN_30_DAYS]: 10,
      [RosterActivityBand.WITHIN_90_DAYS]: 5,
      [RosterActivityBand.OVER_90_DAYS]: 5,
      [RosterActivityBand.UNKNOWN]: 0,
    },
    ...overrides,
  };
}

describe('ActivityReportComponent', () => {
  let fixture: ComponentFixture<ActivityReportComponent>;

  beforeEach(() => configureReportView(ActivityReportComponent));

  /**
   * Draws the report.
   *
   * @param exports - Its exports.
   * @param view - How much the reader is shown.
   */
  function render(
    exports: ActivityExport[],
    view = FleetReportView.FULL,
  ): void {
    const report: FleetActivityReport = {
      ...reportHeader(FleetReport.ACTIVITY, view),
      exports,
    };

    fixture = TestBed.createComponent(ActivityReportComponent);
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

  it('bands each export’s members by how long before it they were active', () => {
    render([activity(1), activity(15, { partial: true })]);

    expect(
      Array.from(table().querySelectorAll('th')).map(cell =>
        cell.textContent?.trim(),
      ),
    ).toEqual([
      'Export',
      'Members',
      '7 days or less',
      '7 to 30 days',
      '30 to 90 days',
      'Over 90 days',
      'Not given',
    ]);
    expect(cellsOf(table())).toEqual([
      ['Nov 1, 2024, 12:00:00 PM', '40', '20', '10', '5', '5', '0'],
      ['Nov 15, 2024, 12:00:00 PM partial', '40', '20', '10', '5', '5', '0'],
    ]);
    // Each cell names its band for a narrow screen.
    expect(
      table()
        .querySelector('tbody td:nth-child(3)')
        ?.getAttribute('data-label'),
    ).toBe('7 days or less');
  });

  it('draws the latest export in the span', () => {
    render([
      activity(1),
      activity(15, {
        bands: {
          [RosterActivityBand.WITHIN_7_DAYS]: 30,
          [RosterActivityBand.WITHIN_30_DAYS]: 0,
          [RosterActivityBand.WITHIN_90_DAYS]: 5,
          [RosterActivityBand.OVER_90_DAYS]: 5,
          [RosterActivityBand.UNKNOWN]: 0,
        },
      }),
    ]);

    expect(text()).toContain('Last active, as of Nov 15, 2024, 12:00:00 PM');
    expect(fixture.componentInstance.chart()).toEqual({
      data: [
        { name: '7 days or less', count: 30 },
        { name: '7 to 30 days', count: 0 },
        { name: '30 to 90 days', count: 5 },
        { name: 'Over 90 days', count: 5 },
        { name: 'Not given', count: 0 },
      ],
      hidden: 0,
    });
    expect(text()).not.toContain('hidden, so not drawn');
  });

  it('writes a hidden count as < 5, and leaves it out of the chart', () => {
    render(
      [
        activity(1, {
          bands: {
            [RosterActivityBand.WITHIN_7_DAYS]: 30,
            [RosterActivityBand.WITHIN_30_DAYS]: null,
            [RosterActivityBand.WITHIN_90_DAYS]: 6,
            [RosterActivityBand.OVER_90_DAYS]: 5,
            [RosterActivityBand.UNKNOWN]: null,
          },
        }),
      ],
      FleetReportView.AGGREGATE,
    );

    expect(cellsOf(table())[0]).toEqual([
      'Nov 1, 2024, 12:00:00 PM',
      '40',
      '30',
      '< 5',
      '6',
      '5',
      '< 5',
    ]);
    expect(fixture.componentInstance.chart().data.map(bar => bar.name)).toEqual(
      ['7 days or less', '30 to 90 days', 'Over 90 days'],
    );
    expect(text()).toContain('2 bands’ counts are hidden, so not drawn.');
  });

  it('draws no chart when every band is hidden', () => {
    render(
      [
        activity(1, {
          members: null,
          bands: {
            [RosterActivityBand.WITHIN_7_DAYS]: null,
            [RosterActivityBand.WITHIN_30_DAYS]: null,
            [RosterActivityBand.WITHIN_90_DAYS]: null,
            [RosterActivityBand.OVER_90_DAYS]: null,
            [RosterActivityBand.UNKNOWN]: null,
          },
        }),
      ],
      FleetReportView.AGGREGATE,
    );

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).toBeNull();
    expect(text()).toContain('5 bands’ counts are hidden');
  });

  it('says so when the span holds no export', () => {
    render([]);

    expect(fixture.componentInstance.chart()).toEqual({ data: [], hidden: 0 });
    expect(text()).toContain('No export was taken in this span.');
  });
});
