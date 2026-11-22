import { reportChartOf } from './report-chart.utils';

describe('reportChartOf', () => {
  it('draws every figure shown, and counts the hidden ones instead', () => {
    expect(
      reportChartOf([
        { name: 'Nov 1', value: 6 },
        { name: 'Nov 15', value: null },
        { name: 'Dec 1', value: '1200' },
        { name: 'Dec 15', value: 0 },
      ]),
    ).toEqual({
      data: [
        { name: 'Nov 1', count: 6 },
        { name: 'Dec 1', count: 1200 },
        { name: 'Dec 15', count: 0 },
      ],
      hidden: 1,
    });
  });

  it('draws nothing from nothing', () => {
    expect(reportChartOf([])).toEqual({ data: [], hidden: 0 });
  });
});
