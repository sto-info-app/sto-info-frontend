import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  cellsOf,
  configureReportView,
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import {
  ContributionInterval,
  ContributionMember,
  FleetContributionReport,
  FleetReport,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { RosterChangeKind } from 'src/app/models/fleet-roster.models';

import { ContributionReportComponent } from './contribution-report.component';

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
  overrides: Partial<ContributionInterval> = {},
): ContributionInterval {
  return {
    from: exportOn(fromDay),
    to: exportOn(toDay),
    partial: false,
    contributionDelta: '12500000',
    known: 30,
    reset: 1,
    baseline: 2,
    unknown: 0,
    ...overrides,
  };
}

/** A member whose contribution rose, over a gap. */
const KELL: ContributionMember = {
  identityId: 'identity-kell',
  member: { characterName: 'Kell Marr', accountHandle: '@fixture003' },
  kind: RosterChangeKind.CONTRIBUTION_CHANGED,
  delta: '1000',
  fromContribution: '4413000',
  toContribution: '4414000',
  from: exportOn(1),
  acrossGap: true,
};

/** A member whose contribution fell, which is a reset. */
const RESET: ContributionMember = {
  identityId: 'identity-gone',
  member: null,
  kind: RosterChangeKind.CONTRIBUTION_RESET,
  delta: null,
  fromContribution: '900',
  toContribution: '0',
  from: exportOn(15),
  acrossGap: false,
};

describe('ContributionReportComponent', () => {
  let fixture: ComponentFixture<ContributionReportComponent>;

  beforeEach(() => configureReportView(ContributionReportComponent));

  /**
   * Draws the report.
   *
   * @param overrides - Changes to a full report of two intervals, detailed
   *   at the later.
   */
  function render(overrides: Partial<FleetContributionReport> = {}): void {
    const report: FleetContributionReport = {
      ...reportHeader(FleetReport.CONTRIBUTION),
      intervals: [interval(1, 15), interval(15, 29, { partial: true })],
      at: exportOn(29),
      members: [KELL, RESET],
      ...overrides,
    };

    fixture = TestBed.createComponent(ContributionReportComponent);
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

  /** The detail interval's control. */
  const select = (): HTMLSelectElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('#contribution-at');

  it('lists each interval’s rise, and how many members it rests on', () => {
    render();

    expect(cellsOf(tables()[0])).toEqual([
      [
        'Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM',
        '12,500,000',
        '30',
        '1',
        '2',
        '0',
      ],
      [
        'Nov 15, 2024, 12:00:00 PM and Nov 29, 2024, 12:00:00 PM the later export was partial',
        '12,500,000',
        '30',
        '1',
        '2',
        '0',
      ],
    ]);
    expect(text()).toContain('nothing is spread over the days or weeks');
    expect(text()).toContain('A fall is a reset, never a negative gift.');
  });

  it('draws each interval’s total', () => {
    render();

    expect(fixture.componentInstance.chart()).toEqual({
      data: [
        { name: 'Nov 15, 2024', count: 12500000 },
        { name: 'Nov 29, 2024', count: 12500000 },
      ],
      hidden: 0,
    });
  });

  it('lists each member’s rise in the detail interval, then each reset', () => {
    render();

    expect(cellsOf(tables()[1])).toEqual([
      [
        'Kell Marr@fixture003 across a gap, since Nov 1, 2024, 12:00:00 PM: in no interval’s total',
        '1,000',
        '4,413,000',
        '4,414,000',
      ],
      ['A member', 'Reset', '900', '0'],
    ]);
  });

  it('offers every interval in the span for the detail, newest first', () => {
    render();

    const options = Array.from(select()?.options ?? []);

    expect(
      options.map(option => [
        option.value,
        option.selected,
        textOf(option).trim(),
      ]),
    ).toEqual([
      [
        'import-29',
        true,
        'Nov 15, 2024, 12:00:00 PM and Nov 29, 2024, 12:00:00 PM',
      ],
      [
        'import-15',
        false,
        'Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM',
      ],
    ]);
  });

  it('asks for the rises in the interval the reader picks', () => {
    render();

    const asked: string[] = [];

    fixture.componentInstance.atChange.subscribe(importId =>
      asked.push(importId),
    );
    (select() as HTMLSelectElement).value = 'import-15';
    select()?.dispatchEvent(new Event('change'));

    expect(asked).toEqual(['import-15']);
  });

  it('names nobody for an aggregate audience, and writes hidden figures as < 5', () => {
    render({
      ...reportHeader(FleetReport.CONTRIBUTION, FleetReportView.AGGREGATE),
      intervals: [
        interval(1, 15, {
          contributionDelta: null,
          known: null,
          reset: null,
        }),
        interval(15, 29),
      ],
      at: null,
      members: null,
    });

    expect(cellsOf(tables()[0])[0]).toEqual([
      'Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM',
      '< 5',
      '< 5',
      '< 5',
      '2',
      '0',
    ]);
    expect(tables().length).toBe(1);
    expect(select()).toBeNull();
    expect(fixture.componentInstance.chart().data).toEqual([
      { name: 'Nov 29, 2024', count: 12500000 },
    ]);
    expect(text()).toContain('1 interval’s total is hidden, so not drawn.');
  });

  it('draws no chart when every total is hidden', () => {
    render({
      intervals: [
        interval(1, 15, { contributionDelta: null }),
        interval(15, 29, { contributionDelta: null }),
      ],
    });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-smart-chart'),
    ).toBeNull();
    expect(text()).toContain('2 intervals’ totals are hidden');
  });

  it('says so when nobody’s contribution moved in the detail interval', () => {
    render({ members: [] });

    expect(text()).toContain(
      'Nobody’s contribution rose or reset in that interval.',
    );
  });

  it('says so when the span holds no interval', () => {
    render({ intervals: [], at: null, members: null });

    expect(text()).toContain('There are not two exports in this span');
    expect(tables()).toEqual([]);
  });
});
