import { TimeFormatPipe } from './time-format.pipe';

describe('TimeFormatPipe', () => {
  let pipe: TimeFormatPipe;

  beforeEach(() => {
    pipe = new TimeFormatPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  const testCases = [
    { input: 0, expected: '00:00' },
    { input: 5, expected: '00:05' },
    { input: 59, expected: '00:59' },
    { input: 60, expected: '01:00' },
    { input: 65, expected: '01:05' },
    { input: 3599, expected: '59:59' },
    { input: 3600, expected: '1:00:00' },
    { input: 3665, expected: '1:01:05' },
    { input: 7200, expected: '2:00:00' },
    { input: 7325, expected: '2:02:05' },
  ];

  test.each(testCases)(
    'should format $input seconds as "$expected"',
    ({ input, expected }) => {
      expect(pipe.transform(input)).toBe(expected);
    },
  );
});
