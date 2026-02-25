import * as fc from 'fast-check';
import {
  CHARACTER_NAME_PATTERN,
  EMAIL_PATTERN,
  STO_HANDLE_PATTERN,
} from '../../app/shared/constants/regex-patterns.constants';

describe('Regex Patterns Fuzz Tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  it('should handle arbitrary strings in CHARACTER_NAME_PATTERN without hanging', () => {
    fc.assert(
      fc.property(fc.string(), input => {
        expect(() => {
          CHARACTER_NAME_PATTERN.test(input);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle arbitrary strings in STO_HANDLE_PATTERN without hanging', () => {
    fc.assert(
      fc.property(fc.string(), input => {
        expect(() => {
          STO_HANDLE_PATTERN.test(input);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle arbitrary strings in EMAIL_PATTERN without hanging', () => {
    fc.assert(
      fc.property(fc.string(), input => {
        expect(() => {
          EMAIL_PATTERN.test(input);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle pathological strings for STO_HANDLE_PATTERN', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), prefix => {
        const pathologicalInput = prefix + '#'.repeat(100) + '1234';
        expect(() => {
          STO_HANDLE_PATTERN.test(pathologicalInput);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });
});
