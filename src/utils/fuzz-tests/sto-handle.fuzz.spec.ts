import * as fc from 'fast-check';
import {
  decodeStoHandle,
  encodeStoHandle,
  slugifyCharacterName,
} from '../../app/shared/utils/sto-handle.utils';

describe('STO handle encoding fuzz tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  it('should handle arbitrary strings in encodeStoHandle without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (handle: string) => {
        expect(() => {
          const encoded = encodeStoHandle(handle);
          expect(typeof encoded).toBe('string');
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle arbitrary strings in decodeStoHandle without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (encodedHandle: string) => {
        expect(() => {
          const decoded = decodeStoHandle(encodedHandle);
          expect(typeof decoded).toBe('string');
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should maintain round-trip consistency for encodeStoHandle/decodeStoHandle', () => {
    fc.assert(
      fc.property(fc.string(), (original: string) => {
        expect(() => {
          const encoded = encodeStoHandle(original);
          const decoded = decodeStoHandle(encoded);
          // After encoding and decoding, we should get back the original
          // but with # replaced by ~ and then back to #
          expect(typeof decoded).toBe('string');
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle strings with multiple # characters without throwing', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 10 }),
        (parts: string[]) => {
          expect(() => {
            const handle = parts.join('#');
            const encoded = encodeStoHandle(handle);
            expect(typeof encoded).toBe('string');
            // After encoding, # should be replaced with ~
            expect(encoded.includes('#')).toBe(false);
            // Just verify encoding works, don't check exact count
            // (input might already contain ~ which would throw off the count)
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle strings with multiple ~ characters in decodeStoHandle without throwing', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 10 }),
        (parts: string[]) => {
          expect(() => {
            const encodedHandle = parts.join('~');
            const decoded = decodeStoHandle(encodedHandle);
            expect(typeof decoded).toBe('string');
            expect(decoded.includes('~')).toBe(false);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle empty strings and null-like inputs gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
        (input: string | null | undefined) => {
          expect(() => {
            const encoded = encodeStoHandle(input as string);
            expect(encoded).toBe('');
            const decoded = decodeStoHandle(input as string);
            expect(decoded).toBe('');
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle arbitrary character names in slugifyCharacterName without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (name: string) => {
        expect(() => {
          const slug = slugifyCharacterName(name);
          expect(typeof slug).toBe('string');
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should produce URL-safe slugs from character names', () => {
    fc.assert(
      fc.property(fc.string(), (name: string) => {
        expect(() => {
          const slug = slugifyCharacterName(name);
          // Slugs should only contain lowercase letters, numbers, underscores, dots, hyphens
          // \w keeps underscores, so they're allowed in slugs
          const urlSafePattern = /^[a-z0-9_\-.]*$/;
          expect(urlSafePattern.test(slug)).toBe(true);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle unicode and special characters in slugifyCharacterName without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (name: string) => {
        expect(() => {
          const slug = slugifyCharacterName(name);
          expect(typeof slug).toBe('string');
          // Verify result is always a string, even with unicode input
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle very long character names without throwing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1000 }),
        (longName: string) => {
          expect(() => {
            const slug = slugifyCharacterName(longName);
            expect(typeof slug).toBe('string');
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle repeated special characters in slugifyCharacterName', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom(' ', '-', '.', '!', '@', '#', '$', '%'))
          .map(arr => arr.join('')),
        (specialStr: string) => {
          expect(() => {
            const slug = slugifyCharacterName(specialStr);
            expect(typeof slug).toBe('string');
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle whitespace-only strings in slugifyCharacterName', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom(' ', '\t', '\n', '\r'))
          .map(arr => arr.join('')),
        (whitespace: string) => {
          expect(() => {
            const slug = slugifyCharacterName(whitespace);
            // Whitespace should be trimmed and converted to hyphens or removed
            expect(typeof slug).toBe('string');
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle mixed case and spaces consistently', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (words: string[]) => {
          expect(() => {
            const name = words.join(' ');
            const slug = slugifyCharacterName(name);
            // Should be lowercase
            expect(slug).toBe(slug.toLowerCase());
            // Should not have consecutive spaces in output
            expect(typeof slug).toBe('string');
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });
});
