import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

expect.extend({
  toBeTrue(received: unknown) {
    const pass = received === true;
    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          pass ? 'not ' : ''
        }to be true`,
    };
  },
  toBeFalse(received: unknown) {
    const pass = received === false;
    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          pass ? 'not ' : ''
        }to be false`,
    };
  },
});

// Minimal jasmine global used in existing specs (SpyObj/createSpyObj)
type JasmineLike = {
  createSpyObj: (
    baseName: string,
    methodNames?: readonly string[],
    properties?: Record<string, unknown>,
  ) => Record<string, unknown>;
};

// Omit Jasmine's global spyOn so we can safely re-declare it as Jest's spyOn
type ExtendedGlobal = Omit<typeof globalThis, 'spyOn'> & {
  jasmine?: JasmineLike;
  spyOn?: typeof jest.spyOn;
  IntersectionObserver?: typeof IntersectionObserver;
};

const extendedGlobal = globalThis as unknown as ExtendedGlobal;

extendedGlobal.jasmine = {
  ...extendedGlobal.jasmine,
  createSpyObj: (
    baseName: string,
    methodNames: readonly string[] = [],
    properties?: Record<string, unknown>,
  ) => {
    const obj: Record<string, unknown> = {};
    for (const name of methodNames) {
      obj[name] = jest.fn();
    }
    if (properties) {
      Object.assign(obj, properties);
    }
    return obj;
  },
};

// Global spyOn delegating to Jest's spy implementation
extendedGlobal.spyOn = jest.spyOn as typeof jest.spyOn;

// JSDOM does not implement URL.createObjectURL by default, but some
// browser-focused libraries (e.g. ngx-image-cropper) rely on it.
// Provide a minimal stub so those libraries work under Jest.
if (typeof URL !== 'undefined') {
  const urlWithObjectUrl = URL as typeof URL & {
    createObjectURL?: (blob: Blob | MediaSource) => string;
    revokeObjectURL?: (url: string) => void;
  };
  if (typeof urlWithObjectUrl.createObjectURL !== 'function') {
    urlWithObjectUrl.createObjectURL = jest.fn(() => 'blob:mock-url') as (
      blob: Blob | MediaSource,
    ) => string;
  }
  if (typeof urlWithObjectUrl.revokeObjectURL !== 'function') {
    urlWithObjectUrl.revokeObjectURL = jest.fn() as (url: string) => void;
  }
}

// JSDOM does not provide IntersectionObserver; Angular's viewport
// utilities rely on it. Provide a minimal no-op mock to prevent
// ReferenceError and noisy console errors during tests.
if (extendedGlobal.IntersectionObserver === undefined) {
  class MockIntersectionObserver {
    // constructor(_callback: IntersectionObserverCallback) {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect(): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  extendedGlobal.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
