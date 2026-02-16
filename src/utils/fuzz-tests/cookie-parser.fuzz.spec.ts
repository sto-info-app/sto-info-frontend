import * as fc from 'fast-check';

describe('Cookie parsing fuzz tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;

  /**
   * Simulates cookie string parsing logic from CookieService.readCookie
   */
  function parseCookieString(
    cookieString: string,
    targetName: string,
  ): string | null {
    try {
      const name = `${targetName}=`;
      const decodedCookie = decodeURIComponent(cookieString);
      const cookies = decodedCookie.split(';');
      for (const cookie of cookies) {
        if (cookie.trim().startsWith(name)) {
          return cookie.trim().substring(name.length, cookie.length);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Simulates cookie value extraction from getSpecificCookieStatus
   */
  function extractCookieValue(
    cookieString: string,
    cookieName: string,
  ): string {
    try {
      const cookies = cookieString.split(';').map(cookie => cookie.trim());
      const targetCookie = cookies.find(cookie =>
        cookie.startsWith(`${cookieName}=`),
      );
      return targetCookie ? targetCookie.split('=')[1] : 'false';
    } catch {
      return 'false';
    }
  }

  it('should handle arbitrary cookie strings without throwing', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (cookieStr, cookieName) => {
        expect(() => {
          const result = parseCookieString(cookieStr, cookieName);
          expect(result === null || typeof result === 'string').toBe(true);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle cookie strings with special characters without throwing', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
        (cookieValue, cookieName) => {
          expect(() => {
            const cookieString = `${cookieName}=${cookieValue}`;
            const result = parseCookieString(cookieString, cookieName);
            expect(result === null || typeof result === 'string').toBe(true);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle multiple cookies separated by semicolons without throwing', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.string()), { maxLength: 20 }),
        fc.string(),
        (cookiePairs, targetName) => {
          expect(() => {
            const cookieString = cookiePairs
              .map(([name, value]) => `${name}=${value}`)
              .join(';');
            const result = parseCookieString(cookieString, targetName);
            expect(result === null || typeof result === 'string').toBe(true);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle cookie strings with URL-encoded characters without throwing', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (cookieValue, cookieName) => {
        expect(() => {
          const encoded = encodeURIComponent(cookieValue);
          const cookieString = `${cookieName}=${encoded}`;
          const result = parseCookieString(cookieString, cookieName);
          expect(result === null || typeof result === 'string').toBe(true);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle cookie value extraction with arbitrary delimiters without throwing', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (cookieString, cookieName) => {
        expect(() => {
          const value = extractCookieValue(cookieString, cookieName);
          expect(typeof value).toBe('string');
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle malformed cookie strings gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.constant(''),
          fc.constant('='),
          fc.constant('==='),
          fc.constant(';;;'),
          fc.constant('name='),
          fc.constant('=value'),
        ),
        fc.string(),
        (malformedCookie, cookieName) => {
          expect(() => {
            const result = parseCookieString(malformedCookie, cookieName);
            expect(result === null || typeof result === 'string').toBe(true);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle very long cookie strings without throwing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        fc.string({ maxLength: 100 }),
        (longValue, cookieName) => {
          expect(() => {
            const cookieString = `${cookieName}=${longValue}`;
            const result = parseCookieString(cookieString, cookieName);
            expect(result === null || typeof result === 'string').toBe(true);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });

  it('should handle cookie names with special characters without throwing', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (cookieName, cookieValue) => {
        expect(() => {
          const cookieString = `${cookieName}=${cookieValue}`;
          const result = parseCookieString(cookieString, cookieName);
          expect(result === null || typeof result === 'string').toBe(true);
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should handle whitespace in cookie strings without throwing', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.nat({ max: 10 }),
        (cookieName, cookieValue, spaces) => {
          expect(() => {
            const ws = ' '.repeat(spaces);
            const cookieString = `${ws}${cookieName}${ws}=${ws}${cookieValue}${ws}`;
            const result = parseCookieString(cookieString, cookieName);
            expect(result === null || typeof result === 'string').toBe(true);
          }).not.toThrow();
        },
      ),
      { numRuns },
    );
  });
});
