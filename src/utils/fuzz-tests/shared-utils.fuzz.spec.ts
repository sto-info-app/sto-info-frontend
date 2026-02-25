import * as fc from 'fast-check';
import { alertStateFromHttpStatus } from '../../app/shared/_helpers/alert-state-from-http-status';
import { TimeFormatPipe } from '../../app/shared/pipes/time-format.pipe';
import { DatesTimeHelperService } from '../../app/shared/services/dates-time-helper.service';
import { FileHandlingService } from '../../app/shared/services/file-handling.service';

describe('Shared Services and Utils Fuzz Tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  const datesTimeHelper = new DatesTimeHelperService();
  const fileHandlingService = new FileHandlingService();
  const timeFormatPipe = new TimeFormatPipe();

  describe('DatesTimeHelperService.timeSince', () => {
    it('should handle arbitrary dates without throwing', () => {
      fc.assert(
        fc.property(fc.date(), date => {
          expect(() => {
            const result = datesTimeHelper.timeSince(date);
            expect(typeof result).toBe('string');
          }).not.toThrow();
        }),
        { numRuns },
      );
    });

    it('should handle arbitrary date strings without throwing', () => {
      fc.assert(
        fc.property(
          fc.date().map(d => d.toISOString()),
          dateStr => {
            expect(() => {
              const result = datesTimeHelper.timeSince(dateStr);
              expect(typeof result).toBe('string');
            }).not.toThrow();
          },
        ),
        { numRuns },
      );
    });

    it('should handle invalid date strings gracefully', () => {
      fc.assert(
        fc.property(fc.string(), invalidDateStr => {
          expect(() => {
            const result = datesTimeHelper.timeSince(invalidDateStr);
            expect(typeof result).toBe('string');
          }).not.toThrow();
        }),
        { numRuns },
      );
    });
  });

  describe('FileHandlingService.dataURItoBlob', () => {
    it('should handle arbitrary strings without crashing', () => {
      fc.assert(
        fc.property(fc.string(), dataURI => {
          expect(() => {
            try {
              fileHandlingService.dataURItoBlob(dataURI);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              expect(errorMessage).toBe('Invalid base64 string');
            }
          }).not.toThrow();
        }),
        { numRuns },
      );
    });

    it('should handle malformed base64 image strings', () => {
      fc.assert(
        fc.property(
          fc.constant('data:image/png;base64,'),
          fc.string(),
          (prefix, base64) => {
            expect(() => {
              try {
                fileHandlingService.dataURItoBlob(prefix + base64);
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                expect(errorMessage).toBe('Invalid base64 string');
              }
            }).not.toThrow();
          },
        ),
        { numRuns },
      );
    });
  });

  describe('TimeFormatPipe.transform', () => {
    it('should handle arbitrary numbers without throwing', () => {
      fc.assert(
        fc.property(fc.integer(), value => {
          expect(() => {
            const result = timeFormatPipe.transform(value);
            expect(typeof result).toBe('string');
          }).not.toThrow();
        }),
        { numRuns },
      );
    });

    it('should handle very large numbers', () => {
      fc.assert(
        fc.property(fc.maxSafeInteger(), value => {
          expect(() => {
            const result = timeFormatPipe.transform(value);
            expect(typeof result).toBe('string');
          }).not.toThrow();
        }),
        { numRuns },
      );
    });
  });

  describe('alertStateFromHttpStatus', () => {
    it('should handle arbitrary integers without throwing', () => {
      fc.assert(
        fc.property(fc.integer(), status => {
          expect(() => {
            const result = alertStateFromHttpStatus(status);
            expect(['green', 'yellow', 'red', 'blue', 'grey']).toContain(
              result,
            );
          }).not.toThrow();
        }),
        { numRuns },
      );
    });
  });
});
