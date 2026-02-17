import * as fc from 'fast-check';

describe('URL parsing fuzz tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  it('should handle arbitrary URL strings without throwing', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url: string) => {
        expect(() => {
          try {
            const parsed = new URL(url);
            // Basic validation that URL constructor worked
            expect(parsed.href).toBeDefined();
          } catch (err) {
            // URL constructor can throw for invalid URLs, which is acceptable
            expect(err).toBeInstanceOf(TypeError);
          }
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle arbitrary query parameters without throwing', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.dictionary(fc.string(), fc.string()),
        (baseUrl: string, params: Record<string, string>) => {
          expect(() => {
            try {
              const url = new URL(baseUrl);
              Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
              });
              // Verify searchParams API works
              expect(url.searchParams.toString()).toBeDefined();
            } catch (err) {
              // URL constructor can throw for invalid URLs
              expect(err).toBeInstanceOf(TypeError);
            }
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle pathname parsing for arbitrary strings without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (pathname: string) => {
        expect(() => {
          // Simulate route parsing
          const segments = pathname.split('/').filter(Boolean);
          expect(Array.isArray(segments)).toBe(true);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });
});
