import * as fc from 'fast-check';
import { alertStateFromHttpStatus } from '../../app/shared/_helpers/alert-state-from-http-status';
import { TimeFormatPipe } from '../../app/shared/pipes/time-format.pipe';
import { DatesTimeHelperService } from '../../app/shared/services/dates-time-helper.service';
import { FileHandlingService } from '../../app/shared/services/file-handling.service';
import { RoutingService } from '../../app/shared/services/routing.service';

describe('Shared Services and Utils Fuzz Tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  const datesTimeHelper = new DatesTimeHelperService();
  const fileHandlingService = new FileHandlingService();
  const timeFormatPipe = new TimeFormatPipe();
  const routingService = new RoutingService();

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
          fc
            .date({ min: new Date('1900-01-01'), max: new Date('2100-01-01') })
            .filter(d => !Number.isNaN(d.getTime()))
            .map(d => d.toISOString()),
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
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

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

  describe('RoutingService.getLink', () => {
    it('should handle arbitrary route strings without throwing and return path starting with /', () => {
      fc.assert(
        fc.property(fc.string(), route => {
          expect(() => {
            const link = routingService.getLink(route);
            expect(typeof link).toBe('string');
            expect(link.startsWith('/')).toBe(true);
          }).not.toThrow();
        }),
        { numRuns },
      );
    });
  });
});
