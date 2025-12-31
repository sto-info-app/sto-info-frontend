import { TestBed } from '@angular/core/testing';
import { DatesTimeHelperService } from './dates-time-helper.service';

describe('DatesTimeHelperService', () => {
  let service: DatesTimeHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatesTimeHelperService],
    });
    service = TestBed.inject(DatesTimeHelperService);

    // Lock time
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('timeSince', () => {
    const cases = [
      { date: '2023-01-01T11:59:55Z', expected: '5 seconds ago' },
      { date: '2023-01-01T11:59:59Z', expected: '1 second ago' },
      { date: '2023-01-01T11:59:00Z', expected: '1 minute ago' },
      { date: '2023-01-01T11:55:00Z', expected: '5 minutes ago' },
      { date: '2023-01-01T11:00:00Z', expected: '1 hour ago' },
      { date: '2023-01-01T10:00:00Z', expected: '2 hours ago' },
      { date: '2022-12-31T12:00:00Z', expected: '1 day ago' },
      { date: '2022-12-25T12:00:00Z', expected: '7 days ago' },
      { date: '2022-12-01T12:00:00Z', expected: '1 month ago' }, // Approx 30 days
      { date: '2022-11-01T12:00:00Z', expected: '2 months ago' },
      { date: '2022-01-01T12:00:00Z', expected: '1 year ago' }, // Approx 12 months
      { date: '2021-01-01T12:00:00Z', expected: '2 years ago' },
    ];

    test.each(cases)(
      'should return "$expected" for $date',
      ({ date, expected }) => {
        const result = service.timeSince(date);
        // Note: the implementation uses approximations (month = 30 days, year = 12 months).
        // We align expectations with implementation logic:
        // seconds = diff / 1000
        // minutes = seconds / 60
        // hours = minutes / 60
        // days = hours / 24
        // months = days / 30
        // years = months / 12
        // It returns the FIRST non-zero unit.

        expect(result).toBe(expected);
      },
    );

    it('should handle Date object input', () => {
      const date = new Date('2023-01-01T11:59:55Z');
      expect(service.timeSince(date)).toBe('5 seconds ago');
    });
  });
});
