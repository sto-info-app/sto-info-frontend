import { ReportFigurePipe } from './report-figure.pipe';

describe('ReportFigurePipe', () => {
  const pipe = new ReportFigurePipe();

  it('writes a count with its thousands separated', () => {
    expect(pipe.transform(1234, 5)).toBe('1,234');
    expect(pipe.transform(0, 5)).toBe('0');
  });

  it('writes a contribution total larger than a number holds exactly', () => {
    expect(pipe.transform('9007199254740993', 5)).toBe('9,007,199,254,740,993');
  });

  it('writes a hidden figure as the CSV does, by the smallest cohort', () => {
    expect(pipe.transform(null, 5)).toBe('< 5');
    expect(pipe.transform(null, 10)).toBe('< 10');
  });
});
