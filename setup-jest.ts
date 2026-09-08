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

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// JSDOM throws "Not implemented" for window.scrollTo. Provide a stub to silence it.
globalThis.scrollTo = jest.fn();

// Angular's sanitizer strips the block ids the backend writes onto every
// rendered paragraph, and warns each time it does. Story and Arc descriptions
// are bound to [innerHTML] as plain strings precisely so that the sanitizer
// runs on them, so the stripping is the intended behaviour rather than a
// problem — and it is logged often enough to bury anything genuine. The
// specs that render a description pin the stripping itself; only the noise is
// dropped here. Every other warning still comes through.
const SANITIZER_STRIPPED_WARNING = 'sanitizing HTML stripped some content';
const passThroughWarn = console.warn.bind(console);

console.warn = (...args: unknown[]): void => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes(SANITIZER_STRIPPED_WARNING)
  ) {
    return;
  }

  passThroughWarn(...args);
};
