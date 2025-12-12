// Minimal Jasmine compatibility types so existing specs compile under Jest.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace jasmine {
  type SpyObj<T> = {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
      ? jest.Mock<ReturnType<T[K]>, Parameters<T[K]>>
      : T[K];
  };

  function createSpyObj<T>(
    baseName: string,
    methodNames: readonly (keyof T & string)[] | readonly string[],
    propertyNames?: Partial<Record<keyof T & string, unknown>>,
  ): SpyObj<T>;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTrue(): R;
      toBeFalse(): R;
    }
  }
}

// Global spyOn helper to mirror Jasmine's API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function spyOn<T, K extends keyof T & string>(
  object: T,
  method: K,
): jest.SpyInstance<
  T[K] extends (...args: unknown[]) => unknown ? ReturnType<T[K]> : unknown
>;

export {};
