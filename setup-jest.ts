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
if (globalThis.IntersectionObserver === undefined) {
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

  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// JSDOM throws "Not implemented" for window.scrollTo. Provide a stub to silence it.
globalThis.scrollTo = jest.fn();
